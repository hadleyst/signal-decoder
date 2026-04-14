import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
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
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .single();

  const isSubscribed = sub?.status === "active" &&
    new Date(sub.current_period_end) > new Date();

  if (!isSubscribed) {
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
    .select("share_publicly")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    sharePublicly: data?.share_publicly ?? false,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authedProUser(req);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({}));
  const sharePublicly = typeof body?.sharePublicly === "boolean" ? body.sharePublicly : null;

  if (sharePublicly === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Upsert user setting
  const { error: upsertError } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      share_publicly: sharePublicly,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("Settings upsert failed:", upsertError);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  // Sync existing decode_history rows to match the new setting
  const { error: syncError } = await supabase
    .from("decode_history")
    .update({ is_public: sharePublicly })
    .eq("user_id", user.id);

  if (syncError) {
    console.error("History sync failed:", syncError);
    // Setting was saved; existing rows just didn't update. Report partial success.
    return NextResponse.json({ ok: true, syncedHistory: false });
  }

  return NextResponse.json({ ok: true, syncedHistory: true });
}
