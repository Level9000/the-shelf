import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service-role client so the webhook can bypass RLS
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role env vars missing");
  return createClient(url, key);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // supabase_user_id is set in subscription_data.metadata at creation time
        const userId = subscription.metadata?.supabase_user_id
          ?? (session.metadata?.supabase_user_id as string | undefined);

        if (!userId) {
          console.warn("[stripe/webhook] checkout.session.completed missing supabase_user_id");
          break;
        }

        await upsertSubscription(supabase, userId, subscription);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          console.warn("[stripe/webhook] subscription event missing supabase_user_id");
          break;
        }
        await upsertSubscription(supabase, userId, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        await supabase
          .from("user_subscriptions")
          .update({
            status: "expired",
            platform: "stripe",
            cancelled_at: new Date().toISOString(),
            raw_webhook_payload: event as unknown as Record<string, unknown>,
          })
          .eq("user_id", userId);
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;

  // Map Stripe price ID → our internal plan_id
  const planId = mapPriceIdToPlanId(priceId);

  // Map Stripe status → our internal status
  const status = mapStripeStatus(subscription.status);

  await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        platform: "stripe",
        status,
        plan_id: planId,
        entitlement: "builder_access",
        platform_subscription_id: subscription.id,
        current_period_start: item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null,
        current_period_end: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancelled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        raw_webhook_payload: subscription as unknown as Record<string, unknown>,
      },
      { onConflict: "user_id" },
    );
}

function mapStripeStatus(status: Stripe.Subscription["status"]): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "grace_period";
    case "paused":
      return "paused";
    default:
      return "expired";
  }
}

function mapPriceIdToPlanId(priceId: string | null): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BUILDER_MONTHLY) return "authored_builder_monthly";
  if (priceId === process.env.STRIPE_PRICE_BUILDER_ANNUAL) return "authored_builder_annual";
  return null;
}
