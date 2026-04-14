import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateCode(length = 8): string {
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

async function getOrCreateCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Try existing
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .single();
  if (existing?.code) return existing.code;

  // Insert with collision retry
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(8);
    const { error } = await supabase
      .from("referral_codes")
      .insert({ user_id: userId, code });
    if (!error) return code;
    // If user_id conflict (race: another concurrent request created it), re-fetch
    if (error.code === "23505" && error.message.includes("user_id")) {
      const { data: raced } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .single();
      if (raced?.code) return raced.code;
    }
    // Otherwise code collision — loop to generate a new one
  }
  throw new Error("Could not generate referral code");
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Pro gate
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .single();

  const isSubscribed = sub?.status === "active" &&
    new Date(sub.current_period_end) > new Date();

  if (!isSubscribed) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  let code: string;
  try {
    code = await getOrCreateCode(supabase, user.id);
  } catch {
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }

  // Count credited referrals (each = 1 free month)
  const { count: creditedCount } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_user_id", user.id)
    .eq("status", "credited");

  // Total signups (any status) for transparency
  const { count: totalCount } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_user_id", user.id);

  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const url = `${origin}/ref/${code}`;

  return NextResponse.json({
    code,
    url,
    referralCount: totalCount || 0,
    freeMonthsEarned: creditedCount || 0,
  });
}
