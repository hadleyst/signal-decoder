import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("email_captures").upsert(
    {
      email,
      source: "anon_gate",
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
    },
    { onConflict: "email", ignoreDuplicates: true }
  );

  if (error) {
    console.error("email_captures upsert failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
