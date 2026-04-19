import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return new Resend(key);
}

interface Signal {
  slug: string;
  explanation: string;
  sentiment: string;
  risk: string;
  timeframe: string;
  coin_symbol: string | null;
  created_at: string;
}

function sentimentColor(s: string): string {
  if (s === "Bullish") return "#34d399";
  if (s === "Bearish") return "#f87171";
  return "#fbbf24";
}

function riskColor(r: string): string {
  if (r === "Low") return "#34d399";
  if (r === "High") return "#f87171";
  return "#fbbf24";
}

function sentimentIcon(s: string): string {
  if (s === "Bullish") return "\u2191";
  if (s === "Bearish") return "\u2193";
  return "\u2194";
}

function buildEmailHtml(signals: Signal[]): string {
  const cards = signals
    .map((s) => {
      const coin = s.coin_symbol ? `<span style="color:#22d3ee;font-weight:700;font-size:12px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.2);border-radius:4px;padding:2px 6px;margin-right:8px;">${s.coin_symbol}</span>` : "";
      const sentColor = sentimentColor(s.sentiment);
      const rColor = riskColor(s.risk);
      const url = `https://signaldecoder.app/signal/${s.slug}`;

      return `
      <tr><td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
          <tr><td style="padding:20px;">
            <div style="margin-bottom:12px;">
              ${coin}
              <span style="color:${sentColor};font-size:12px;font-weight:600;">${sentimentIcon(s.sentiment)} ${s.sentiment}</span>
              <span style="color:rgba(255,255,255,0.3);margin:0 6px;">&middot;</span>
              <span style="color:${rColor};font-size:12px;font-weight:600;">${s.risk} Risk</span>
            </div>
            <p style="color:#e2e4ea;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              ${s.explanation.length > 200 ? s.explanation.slice(0, 200) + "..." : s.explanation}
            </p>
            <a href="${url}" style="color:#22d3ee;font-size:13px;font-weight:600;text-decoration:none;">
              View full decode &rarr;
            </a>
          </td></tr>
        </table>
      </td></tr>`;
    })
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0f;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;">Signal</span><span style="font-size:22px;font-weight:700;color:#22d3ee;">Decoder</span>
          <p style="color:#787878;font-size:13px;margin:8px 0 0 0;">Your weekly signal digest</p>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:0 0 24px 0;">
          <p style="color:#bcbcbc;font-size:14px;line-height:1.6;margin:0;">
            Here are the top decoded crypto signals from this week. Each one has been analyzed for sentiment, risk, and jargon — explained in plain English.
          </p>
        </td></tr>

        <!-- Signal cards -->
        ${cards}

        <!-- CTA -->
        <tr><td style="padding:16px 0 0 0;text-align:center;">
          <a href="https://signaldecoder.app/app" style="display:inline-block;background:#0891b2;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">
            Decode a signal
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:40px 0 0 0;text-align:center;border-top:1px solid rgba(255,255,255,0.05);margin-top:32px;">
          <p style="color:#545454;font-size:11px;line-height:1.5;margin:24px 0 0 0;">
            You're receiving this because you're a SignalDecoder Pro subscriber.<br>
            <a href="https://signaldecoder.app/settings" style="color:#787878;text-decoration:underline;">Unsubscribe from digest</a>
          </p>
          <p style="color:#383838;font-size:11px;margin:8px 0 0 0;">
            signaldecoder.app &middot; For educational purposes only. Not financial advice.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or allow in dev)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 1. Get top 5 recent public signals from the last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: signals, error: sigError } = await supabase
    .from("public_signals")
    .select("slug, explanation, sentiment, risk, timeframe, coin_symbol, created_at")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  if (sigError) {
    console.error("Digest: failed to fetch signals:", sigError);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    console.log("Digest: no signals this week, skipping");
    return NextResponse.json({ sent: 0, reason: "no signals" });
  }

  // Pick top 5 with sentiment variety
  const picked: Signal[] = [];
  const bySentiment: Record<string, Signal[]> = { Bullish: [], Bearish: [], Neutral: [] };
  for (const s of signals) {
    (bySentiment[s.sentiment] || []).push(s as Signal);
  }
  // Round-robin pick from each sentiment bucket
  const buckets = ["Bullish", "Bearish", "Neutral"];
  let idx = 0;
  while (picked.length < 5) {
    const bucket = bySentiment[buckets[idx % 3]];
    if (bucket && bucket.length > 0) {
      picked.push(bucket.shift()!);
    }
    idx++;
    // Safety: if all buckets empty, break
    if (Object.values(bySentiment).every((b) => b.length === 0)) break;
  }

  if (picked.length === 0) {
    console.log("Digest: no suitable signals after filtering");
    return NextResponse.json({ sent: 0, reason: "no signals after filter" });
  }

  // 2. Get all Pro users who haven't opted out of the digest
  const { data: subs, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, status")
    .eq("status", "active");

  if (subError || !subs) {
    console.error("Digest: failed to fetch subscribers:", subError);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }

  const userIds = subs.map((s) => s.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no active subscribers" });
  }

  // Check opt-out preferences
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id, weekly_digest")
    .in("user_id", userIds);

  const optedOut = new Set(
    (settings || []).filter((s) => s.weekly_digest === false).map((s) => s.user_id)
  );

  const eligibleUserIds = userIds.filter((id) => !optedOut.has(id));

  if (eligibleUserIds.length === 0) {
    return NextResponse.json({ sent: 0, reason: "all subscribers opted out" });
  }

  // 3. Get emails for eligible users
  const emails: string[] = [];
  for (const uid of eligibleUserIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    if (userData?.user?.email) emails.push(userData.user.email);
  }

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no emails found" });
  }

  // 4. Send emails via Resend
  const html = buildEmailHtml(picked);
  const resend = getResend();
  let sent = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: "SignalDecoder <digest@signaldecoder.app>",
        to: email,
        subject: `Your Weekly Signal Digest — ${picked.length} decoded signals`,
        html,
      });
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Digest: failed to send to ${email}:`, msg);
      errors.push(msg);
    }
  }

  console.log(`Digest: sent ${sent}/${emails.length} emails, ${errors.length} failures`);
  return NextResponse.json({ sent, total: emails.length, errors: errors.length });
}
