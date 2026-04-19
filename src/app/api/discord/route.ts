/**
 * Discord Interactions Webhook for SignalDecoder
 *
 * SETUP:
 * 1. Create app at https://discord.com/developers/applications
 * 2. Set these env vars in Vercel:
 *    - DISCORD_PUBLIC_KEY   (from app General Information page)
 *    - DISCORD_APP_ID       (application id)
 *    - DISCORD_BOT_TOKEN    (from Bot page — used only by register-commands.js)
 * 3. Deploy this route, then set Interactions Endpoint URL in Discord to:
 *    https://signaldecoder.app/api/discord
 * 4. Register the /decode slash command:
 *    node register-commands.js
 * 5. Invite bot to a server:
 *    https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=applications.commands
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Discord constants
const INTERACTION_PING = 1;
const INTERACTION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_DEFERRED = 5;

const systemPrompt = `You are a crypto signal decoder. The user will paste a crypto trading signal, tweet, message, or screenshot of a chart/signal. Analyze it and return a JSON response with these fields:

- "explanation": A plain English explanation of what the signal means, written for someone who is not a crypto expert. 2-4 sentences.
- "sentiment": One of "Bullish", "Bearish", or "Neutral".
- "riskLevel": One of "Low", "Medium", or "High", based on the aggressiveness of the signal.
- "timeframe": The timeframe mentioned or implied (e.g. "Short-term (hours)", "Medium-term (days-weeks)", "Long-term (months+)"). If none is mentioned, use "Not specified".
- "glossary": An array of objects with "term" and "definition" keys for any technical, crypto-specific, or jargon terms shown. Only include terms that a general audience wouldn't know.
- "coin": An object with "symbol" (ticker, uppercase, like "BTC") and "name" (full name, like "Bitcoin") for the primary coin the signal is about. If the signal doesn't clearly reference a specific coin, set this to null. Only include one coin — the main subject of the signal.

Return ONLY valid JSON, no markdown fences or extra text.`;

interface DecodeResult {
  explanation: string;
  sentiment: string;
  riskLevel: string;
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
  coin?: { symbol: string; name: string } | null;
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (let i = 0; i < 6; i++) slug += chars[bytes[i] % chars.length];
  return slug;
}

// --- Signature verification ---
// Using raw hex comparison with tweetnacl-style verify via Web Crypto
async function verifyRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  if (!publicKey || !signature || !timestamp) {
    console.error("[discord] missing verification headers or public key");
    return false;
  }

  try {
    const keyBytes = hexToBytes(publicKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes.buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const msg = new TextEncoder().encode(timestamp + rawBody);
    const sig = hexToBytes(signature);
    const valid = await crypto.subtle.verify("Ed25519", key, sig.buffer as ArrayBuffer, msg);
    if (!valid) console.error("[discord] signature mismatch");
    return valid;
  } catch (e) {
    console.error("[discord] signature verify error:", e instanceof Error ? e.message : e);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// --- Decode + save ---
async function decodeSignal(text: string): Promise<DecodeResult> {
  console.log("[discord] calling Claude, signal length:", text.length);
  const claude = new Anthropic();
  const message = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  console.log("[discord] Claude response:", raw.slice(0, 150));
  return JSON.parse(raw);
}

async function savePublicSignal(slug: string, text: string, result: DecodeResult) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("public_signals").insert({
    slug,
    signal_text: text,
    explanation: result.explanation,
    sentiment: result.sentiment,
    risk: result.riskLevel,
    timeframe: result.timeframe,
    glossary: result.glossary,
    coin_symbol: result.coin?.symbol || null,
  });
  if (error) console.error("[discord] DB save failed:", error.message);
  else console.log("[discord] saved public signal:", slug);
}

// --- Discord message builders ---
function buildEmbed(result: DecodeResult, slug: string) {
  const coin = result.coin ? ` ($${result.coin.symbol})` : "";
  const color = result.sentiment === "Bullish" ? 0x34d399 :
                result.sentiment === "Bearish" ? 0xf87171 : 0x9ca3af;

  // Keep footer under Discord's limit
  const glossaryLines = result.glossary.slice(0, 3).map((g) =>
    `${g.term} \u2014 ${g.definition.slice(0, 80)}`
  );
  const footerText = glossaryLines.length > 0
    ? glossaryLines.join("\n")
    : "Decoded by SignalDecoder";

  return {
    title: `\uD83D\uDD0D Signal Decoded${coin}`,
    description: result.explanation,
    color,
    fields: [
      { name: "\uD83D\uDCCA Sentiment", value: result.sentiment, inline: true },
      { name: "\u26A0\uFE0F Risk Level", value: result.riskLevel, inline: true },
      { name: "\u23F1 Timeframe", value: result.timeframe, inline: true },
    ],
    footer: { text: footerText.slice(0, 2048) },
    url: `https://signaldecoder.app/signal/${slug}`,
  };
}

function buildButton(slug: string) {
  return {
    type: 1,
    components: [{
      type: 2,
      style: 5, // LINK
      label: "View full decode",
      url: `https://signaldecoder.app/signal/${slug}`,
    }],
  };
}

async function sendFollowup(appId: string, token: string, payload: object) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;
  console.log("[discord] sending followup to", url.slice(0, 60) + "...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("[discord] followup FAILED:", res.status, body.slice(0, 300));
  } else {
    console.log("[discord] followup sent successfully");
  }
  return res.ok;
}

// --- Background decode task (runs after response is sent) ---
async function processDecodeCommand(signal: string, appId: string, interactionToken: string) {
  try {
    console.log("[discord] starting decode for:", signal.slice(0, 80));
    const result = await decodeSignal(signal);
    console.log("[discord] decode result:", result.sentiment, result.riskLevel);

    const slug = generateSlug();
    await savePublicSignal(slug, signal, result);

    const embed = buildEmbed(result, slug);
    const button = buildButton(slug);
    await sendFollowup(appId, interactionToken, {
      embeds: [embed],
      components: [button],
    });
  } catch (e) {
    console.error("[discord] processDecodeCommand error:", e instanceof Error ? e.message : e);
    console.error("[discord] stack:", e instanceof Error ? e.stack : "");
    await sendFollowup(appId, interactionToken, {
      content: "\u274C Failed to decode signal. Please try again.",
    });
  }
}

// --- Route handler ---
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.log("[discord] POST received, body length:", rawBody.length);

  // Verify signature
  const valid = await verifyRequest(req, rawBody);
  if (!valid) {
    console.error("[discord] REJECTING: invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }
  console.log("[discord] signature valid");

  const interaction = JSON.parse(rawBody);
  console.log("[discord] interaction type:", interaction.type, "data:", interaction.data?.name);

  // PING — Discord endpoint verification
  if (interaction.type === INTERACTION_PING) {
    console.log("[discord] responding to PING");
    return NextResponse.json({ type: RESPONSE_PONG });
  }

  // /decode command
  if (interaction.type === INTERACTION_COMMAND && interaction.data?.name === "decode") {
    const signal = interaction.data.options?.find(
      (o: { name: string; value: string }) => o.name === "signal"
    )?.value as string | undefined;

    const appId = process.env.DISCORD_APP_ID;
    const interactionToken = interaction.token;

    console.log("[discord] /decode command, signal:", signal?.slice(0, 80), "appId:", appId ? "set" : "MISSING");

    if (!signal || !appId) {
      return NextResponse.json({
        type: 4,
        data: { content: "Please provide a signal to decode." },
      });
    }

    // Use next/server after() to run the decode after the response is sent.
    // This keeps the serverless function alive for the background work.
    after(async () => {
      await processDecodeCommand(signal, appId, interactionToken);
    });

    // Return deferred response immediately — Discord shows "thinking..."
    console.log("[discord] returning DEFERRED response");
    return NextResponse.json({ type: RESPONSE_DEFERRED });
  }

  // Unknown interaction type
  console.log("[discord] unknown interaction type:", interaction.type);
  return NextResponse.json({ type: RESPONSE_PONG });
}
