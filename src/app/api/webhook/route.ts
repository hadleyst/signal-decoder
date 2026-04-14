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

async function processReferral(
  supabase: ReturnType<typeof createServiceClient>,
  refereeUserId: string,
  referralCode: string
) {
  try {
    // Normalize
    const code = referralCode.toLowerCase().trim();
    if (!code) return;

    // Lookup referrer
    const { data: codeRow } = await supabase
      .from("referral_codes")
      .select("user_id")
      .eq("code", code)
      .single();

    const referrerUserId = codeRow?.user_id;
    if (!referrerUserId) {
      console.log("Referral code not found:", code);
      return;
    }

    // Self-referral guard
    if (referrerUserId === refereeUserId) {
      console.log("Skipping self-referral");
      return;
    }

    // Idempotency: already credited this referee?
    const { data: existing } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referee_user_id", refereeUserId)
      .single();

    if (existing) {
      console.log("Referral already recorded for referee", refereeUserId);
      return;
    }

    // Get referrer's Stripe customer ID
    const { data: referrerSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", referrerUserId)
      .single();

    if (!referrerSub?.stripe_customer_id) {
      console.log("Referrer has no Stripe customer yet, recording pending referral");
      await supabase.from("referrals").insert({
        referrer_user_id: referrerUserId,
        referee_user_id: refereeUserId,
        code,
        status: "pending",
      });
      return;
    }

    // Apply $19 customer balance credit (one free month equivalent)
    // Negative amount = credit toward next invoice. Stacks across referrals.
    await stripe.customers.createBalanceTransaction(referrerSub.stripe_customer_id, {
      amount: -1900,
      currency: "usd",
      description: `Referral credit - 1 free month (referee: ${refereeUserId.slice(0, 8)})`,
    });

    await supabase.from("referrals").insert({
      referrer_user_id: referrerUserId,
      referee_user_id: refereeUserId,
      code,
      status: "credited",
      credited_at: new Date().toISOString(),
    });

    console.log(`Referral credited: ${referrerUserId} earned $19 from referee ${refereeUserId}`);
  } catch (e) {
    console.error("Referral processing failed:", e);
  }
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

      // Referral processing (if this signup came through a referral link)
      const referralCode = session.metadata?.referral_code;
      if (referralCode) {
        await processReferral(supabase, userId, referralCode);
      }
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
