import { NextResponse } from "next/server";
import { stripe, PRICE_IDS, type PlanId } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const body = await request.json() as { plan: PlanId };
    const priceId = PRICE_IDS[body.plan];

    if (!priceId || priceId.startsWith("price_REPLACE")) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch or create a Stripe customer ID for this user
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("platform_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // platform_subscription_id stores the Stripe customer ID for web subscribers
    let customerId = sub?.platform_subscription_id ?? undefined;

    if (!customerId || !customerId.startsWith("cus_")) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/projects?checkout=success`,
      cancel_url: `${origin}/projects?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
