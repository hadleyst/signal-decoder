import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isActiveSubscription } from "@/lib/subscription";

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

  // Pro gate removed — all authenticated users have access

  const { data, error } = await supabase
    .from("decode_history")
    .select("id, signal_text, image_url, explanation, sentiment, risk, timeframe, glossary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("History query failed:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}
