import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import Stripe from "stripe";

function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString();
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.toString();

      let periodEnd: string | null = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items"],
        });
        periodEnd = getPeriodEnd(sub);
      }

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: subscriptionId || null,
        status: "active",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;

      if (typeof subscriptionId === "string") {
        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items"],
        });
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            status: "active",
            current_period_end: getPeriodEnd(sub),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from("subscriptions").update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: sub.status === "active" ? "active" : sub.status,
          current_period_end: getPeriodEnd(sub),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
