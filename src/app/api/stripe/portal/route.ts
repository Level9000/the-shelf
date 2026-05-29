import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedUser } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const supabase = await createSupabaseServerClient();

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("platform_subscription_id, platform")
      .eq("user_id", user.id)
      .maybeSingle();

    // platform_subscription_id for Stripe web subscribers holds the subscription ID;
    // we need the customer ID. Retrieve it from the subscription.
    const subscriptionId = sub?.platform_subscription_id;
    if (!subscriptionId || sub?.platform !== "stripe") {
      return NextResponse.json({ error: "No active Stripe subscription found" }, { status: 400 });
    }

    let customerId: string;
    if (subscriptionId.startsWith("cus_")) {
      // Stored as customer ID directly (legacy)
      customerId = subscriptionId;
    } else {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/projects`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
