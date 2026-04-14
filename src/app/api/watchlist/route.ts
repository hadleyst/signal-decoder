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
    .select("status, current_period_end")
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

  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol, name, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("Watchlist fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }

  return NextResponse.json({ watchlist: data });
}

export async function POST(req: NextRequest) {
  const auth = await authedProUser(req);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json();
  const symbol = typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : null;

  if (!symbol || symbol.length > 20) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const { error } = await supabase.from("watchlist").upsert(
    { user_id: user.id, symbol, name },
    { onConflict: "user_id,symbol" }
  );

  if (error) {
    console.error("Watchlist add failed:", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await authedProUser(req);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({}));
  const symbol = typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : "";

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  if (error) {
    console.error("Watchlist delete failed:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
