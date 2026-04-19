import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isActiveSubscription } from "@/lib/subscription";

async function authenticate(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();
  if (!isActiveSubscription(sub)) return null;
  return { user, supabase };
}

// List saved signals
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { data, error } = await auth.supabase
    .from("saved_signals")
    .select("id, slug, signal_text, explanation, sentiment, risk, timeframe, coin_symbol, saved_at")
    .eq("user_id", auth.user.id)
    .order("saved_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Saved signals fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
  return NextResponse.json({ saved: data });
}

// Save a signal
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const body = await req.json();
  const { slug, signal_text, explanation, sentiment, risk, timeframe, coin_symbol } = body;

  if (!explanation || !sentiment || !risk) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("saved_signals")
    .insert({
      user_id: auth.user.id,
      slug: slug || null,
      signal_text: signal_text || null,
      explanation,
      sentiment,
      risk,
      timeframe: timeframe || "Not specified",
      coin_symbol: coin_symbol || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save signal failed:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

// Delete a saved signal
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await auth.supabase
    .from("saved_signals")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Delete saved signal failed:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
