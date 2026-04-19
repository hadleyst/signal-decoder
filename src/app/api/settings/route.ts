import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isActiveSubscription } from "@/lib/subscription";
import type { SupabaseClient, User } from "@supabase/supabase-js";

async function authedProUser(
  req: NextRequest
): Promise<{ user: User; supabase: SupabaseClient } | { error: NextResponse }> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (!isActiveSubscription(sub)) {
    return { error: NextResponse.json({ error: "Pro subscription required" }, { status: 403 }) };
  }

  return { user, supabase };
}

export async function GET(req: NextRequest) {
  const auth = await authedProUser(req);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const { data } = await supabase
    .from("user_settings")
    .select("share_publicly, weekly_digest")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    sharePublicly: data?.share_publicly ?? false,
    weeklyDigest: data?.weekly_digest ?? true,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authedProUser(req);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({}));
  const sharePublicly = typeof body?.sharePublicly === "boolean" ? body.sharePublicly : null;
  const weeklyDigest = typeof body?.weeklyDigest === "boolean" ? body.weeklyDigest : null;

  if (sharePublicly === null && weeklyDigest === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Build upsert payload with only the fields being changed
  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (sharePublicly !== null) upsertPayload.share_publicly = sharePublicly;
  if (weeklyDigest !== null) upsertPayload.weekly_digest = weeklyDigest;

  const { error: upsertError } = await supabase.from("user_settings").upsert(
    upsertPayload,
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("Settings upsert failed:", upsertError);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  // Sync existing decode_history rows when share preference changes
  if (sharePublicly !== null) {
    const { error: syncError } = await supabase
      .from("decode_history")
      .update({ is_public: sharePublicly })
      .eq("user_id", user.id);

    if (syncError) {
      console.error("History sync failed:", syncError);
      return NextResponse.json({ ok: true, syncedHistory: false });
    }
  }

  return NextResponse.json({ ok: true });
}
