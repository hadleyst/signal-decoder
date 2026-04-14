import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Schema-resilient upsert into the subscriptions table.
 * Does NOT require a unique constraint on user_id (the production table lacks one).
 * Logs any errors loudly — silent failures were the original source of the webhook bug.
 */
async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  fields: Record<string, unknown>
) {
  const payload = { ...fields, user_id: userId, updated_at: new Date().toISOString() };

  const { data: existing, error: selectError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("[webhook] subscriptions SELECT failed:", selectError);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id);
    if (error) console.error("[webhook] subscriptions UPDATE failed:", error);
    else console.log(`[webhook] subscriptions row updated for user ${userId}`);
  } else {
    const { error } = await supabase.from("subscriptions").insert(payload);
    if (error) console.error("[webhook] subscriptions INSERT failed:", error);
    else console.log(`[webhook] subscriptions row inserted for user ${userId}`);
  }
}

async function processReferral(
  supabase: SupabaseClient,
  refereeUserId: string,
  referralCode: string
) {
  try {
    const code = referralCode.toLowerCase().trim();
    if (!code) return;

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

    if (referrerUserId === refereeUserId) {
      console.log("Skipping self-referral");
      return;
    }

    const { data: existing } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referee_user_id", refereeUserId)
      .maybeSingle();

    if (existing) {
      console.log("Referral already recorded for referee", refereeUserId);
      return;
    }

    const { data: referrerSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", referrerUserId)
      .maybeSingle();

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
  } catch (e) {
    console.error("[webhook] signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) {
        console.warn("[webhook] checkout.session.completed with no supabase_user_id metadata:", session.id);
        break;
      }

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.toString();

      await upsertSubscription(supabase, userId, {
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: subscriptionId || null,
        status: "active",
      });

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
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await upsertSubscription(supabase, userId, {
            stripe_subscription_id: subscriptionId,
            status: "active",
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) console.error("[webhook] cancel update failed:", error);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await upsertSubscription(supabase, userId, {
          stripe_subscription_id: sub.id,
          status: sub.status === "active" ? "active" : sub.status,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
