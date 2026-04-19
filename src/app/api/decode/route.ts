import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isActiveSubscription } from "@/lib/subscription";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  let authedUser: User | null = null;
  let isSubscribed = false;
  let supabase: SupabaseClient | null = null;

  // For authenticated users, verify they have an active subscription
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      authedUser = user;
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .single();

      isSubscribed = isActiveSubscription(data);
    }
  }

  const body = await req.json();
  const { signal, image, mediaType } = body;

  const hasText = typeof signal === "string" && signal.trim().length > 0;
  const hasImage = typeof image === "string" && image.length > 0;

  if (!hasText && !hasImage) {
    return NextResponse.json({ error: "No signal or image provided" }, { status: 400 });
  }

  if (hasText && signal.length > 2000) {
    return NextResponse.json(
      { error: "Signal too long (max 2000 characters)" },
      { status: 400 }
    );
  }

  if (hasImage) {
    // Max ~7MB base64 ≈ 5MB binary
    if (image.length > 7 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 400 }
      );
    }
    if (mediaType !== "image/jpeg" && mediaType !== "image/png") {
      return NextResponse.json(
        { error: "Unsupported image type (JPG or PNG only)" },
        { status: 400 }
      );
    }
  }

  const systemPrompt = `You are a crypto signal decoder. The user will paste a crypto trading signal, tweet, message, or screenshot of a chart/signal. Analyze it and return a JSON response with these fields:

- "explanation": A plain English explanation of what the signal means, written for someone who is not a crypto expert. 2-4 sentences.
- "sentiment": One of "Bullish", "Bearish", or "Neutral".
- "riskLevel": One of "Low", "Medium", or "High", based on the aggressiveness of the signal.
- "timeframe": The timeframe mentioned or implied (e.g. "Short-term (hours)", "Medium-term (days-weeks)", "Long-term (months+)"). If none is mentioned, use "Not specified".
- "glossary": An array of objects with "term" and "definition" keys for any technical, crypto-specific, or jargon terms shown. Only include terms that a general audience wouldn't know.
- "coin": An object with "symbol" (ticker, uppercase, like "BTC") and "name" (full name, like "Bitcoin") for the primary coin the signal is about. If the signal doesn't clearly reference a specific coin, set this to null. Only include one coin — the main subject of the signal.

Return ONLY valid JSON, no markdown fences or extra text.`;

  const userContent: Anthropic.Messages.ContentBlockParam[] | string = hasImage
    ? [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType as "image/jpeg" | "image/png",
            data: image,
          },
        },
        {
          type: "text" as const,
          text: hasText
            ? signal
            : "Analyze this crypto chart or signal screenshot and return the JSON response as instructed.",
        },
      ]
    : signal;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text);

      // Save to history for subscribed users (non-blocking — decode still succeeds if this fails)
      if (authedUser && isSubscribed && supabase) {
        saveHistory(supabase, authedUser.id, {
          signalText: hasText ? signal : null,
          image: hasImage ? { data: image, mediaType: mediaType as string } : null,
          result: parsed,
        }).catch((err) => console.error("History save failed:", err));
      }

      // Save a public signal page (must complete before returning slug)
      const svc = supabase || createServiceClient();
      const slug = generateSlug();
      let savedSlug: string | null = null;
      try {
        await savePublicSignal(svc, slug, {
          signalText: hasText ? signal : null,
          result: parsed,
        });
        savedSlug = slug;
      } catch (err) {
        console.error("Public signal save failed:", err);
      }

      // Check watchlist alerts (non-blocking)
      if (parsed.coin?.symbol && savedSlug) {
        sendWatchlistAlerts(svc, parsed.coin.symbol, parsed.sentiment, savedSlug)
          .catch((err) => console.error("Watchlist alert failed:", err));
      }

      return NextResponse.json({ ...parsed, slug: savedSlug });
    } catch (e) {
      console.error(`Decode error (attempt ${attempt}/${maxAttempts}):`, e);

      if (attempt === maxAttempts) {
        return NextResponse.json(
          { error: "Failed to decode signal. Please try again." },
          { status: 500 }
        );
      }

      // Wait before retrying (500ms, then 1000ms)
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

interface HistoryPayload {
  signalText: string | null;
  image: { data: string; mediaType: string } | null;
  result: {
    explanation: string;
    sentiment: string;
    riskLevel: string;
    timeframe: string;
    glossary: Array<{ term: string; definition: string }>;
  };
}

async function saveHistory(
  supabase: SupabaseClient,
  userId: string,
  payload: HistoryPayload
) {
  let imageUrl: string | null = null;

  if (payload.image) {
    const ext = payload.image.mediaType === "image/png" ? "png" : "jpg";
    const uuid = crypto.randomUUID();
    const path = `${userId}/${uuid}.${ext}`;
    const buffer = Buffer.from(payload.image.data, "base64");

    const { error: uploadError } = await supabase.storage
      .from("signal-images")
      .upload(path, buffer, {
        contentType: payload.image.mediaType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload failed:", uploadError);
    } else {
      const { data } = supabase.storage.from("signal-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }
  }

  // Read user's public-share preference
  const { data: settings } = await supabase
    .from("user_settings")
    .select("share_publicly")
    .eq("user_id", userId)
    .single();
  const isPublic = settings?.share_publicly ?? false;

  const { error: insertError } = await supabase.from("decode_history").insert({
    user_id: userId,
    signal_text: payload.signalText,
    image_url: imageUrl,
    explanation: payload.result.explanation,
    sentiment: payload.result.sentiment,
    risk: payload.result.riskLevel,
    timeframe: payload.result.timeframe,
    glossary: payload.result.glossary,
    is_public: isPublic,
  });

  if (insertError) {
    console.error("History insert failed:", insertError);
  }
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) slug += chars[bytes[i] % chars.length];
  return slug;
}

async function savePublicSignal(
  supabase: SupabaseClient,
  slug: string,
  payload: { signalText: string | null; result: HistoryPayload["result"] & { coin?: { symbol: string; name: string } | null } },
) {
  const row = {
    slug,
    signal_text: payload.signalText,
    explanation: payload.result.explanation,
    sentiment: payload.result.sentiment,
    risk: payload.result.riskLevel,
    timeframe: payload.result.timeframe,
    glossary: payload.result.glossary,
    coin_symbol: payload.result.coin?.symbol || null,
  };
  const { error } = await supabase.from("public_signals").insert(row);
  if (error) {
    console.error("Public signal insert FAILED:", error.message, error.details, error.hint);
    throw error;
  }
  console.log("Public signal saved:", slug);
}

async function sendWatchlistAlerts(
  supabase: SupabaseClient,
  coinSymbol: string,
  sentiment: string,
  slug: string,
) {
  // Find watchlist entries for this coin with matching alerts
  const sentimentLower = sentiment.toLowerCase();
  const { data: watchers, error } = await supabase
    .from("watchlist")
    .select("user_id, alert_sentiment")
    .eq("symbol", coinSymbol.toUpperCase())
    .neq("alert_sentiment", "none");

  if (error || !watchers || watchers.length === 0) return;

  // Filter by sentiment match
  const matched = watchers.filter((w) =>
    w.alert_sentiment === "any" || w.alert_sentiment === sentimentLower
  );
  if (matched.length === 0) return;

  // Lazy-load Resend
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Watchlist alerts: RESEND_API_KEY not set, skipping");
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const signalUrl = `https://signaldecoder.app/signal/${slug}`;

  for (const watcher of matched) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(watcher.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      await resend.emails.send({
        from: "SignalDecoder <alerts@signaldecoder.app>",
        to: email,
        subject: `New ${sentiment} signal decoded for $${coinSymbol}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0f;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:20px;font-weight:700;color:#fff;">Signal</span><span style="font-size:20px;font-weight:700;color:#22d3ee;">Decoder</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;">
          <p style="color:#787878;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Watchlist Alert</p>
          <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 12px 0;">
            New <span style="color:${sentiment === "Bullish" ? "#34d399" : sentiment === "Bearish" ? "#f87171" : "#fbbf24"}">${sentiment}</span> signal for <span style="color:#22d3ee;">$${coinSymbol}</span>
          </p>
          <p style="color:#bcbcbc;font-size:14px;line-height:1.5;margin:0 0 20px 0;">
            A new signal has been decoded for a coin on your watchlist. Click below to see the full breakdown.
          </p>
          <a href="${signalUrl}" style="display:inline-block;background:#0891b2;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">
            View decode &rarr;
          </a>
        </td></tr>
        <tr><td style="text-align:center;padding-top:24px;">
          <p style="color:#545454;font-size:11px;margin:0;">
            <a href="https://signaldecoder.app/watchlist" style="color:#787878;text-decoration:underline;">Manage alerts</a> &middot; signaldecoder.app
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
      console.log(`Watchlist alert sent to ${email} for $${coinSymbol} (${sentiment})`);
    } catch (e) {
      console.error(`Watchlist alert failed for user ${watcher.user_id}:`, e);
    }
  }
}
