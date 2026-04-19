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
 *    DISCORD_APP_ID=xxx DISCORD_BOT_TOKEN=xxx node register-commands.js
 * 5. Invite bot to a server with this OAuth2 URL (applications.commands scope):
 *    https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=applications.commands
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
// Discord response types
const PONG = 1;
const DEFERRED_CHANNEL_MESSAGE = 5;

function getClaude() {
  return new Anthropic();
}

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

// Verify Discord request signature using Web Crypto API
async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return false;

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) return false;

  try {
    const keyBytes = hexToBytes(publicKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes.buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(timestamp + body);
    const sigBytes = hexToBytes(signature);
    return await crypto.subtle.verify("Ed25519", key, sigBytes.buffer as ArrayBuffer, message);
  } catch (e) {
    console.error("[discord] signature verification error:", e);
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

async function decodeSignal(text: string): Promise<DecodeResult> {
  const claude = getClaude();
  const message = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(raw);
}

async function savePublicSignal(slug: string, text: string, result: DecodeResult) {
  try {
    const supabase = createServiceClient();
    await supabase.from("public_signals").insert({
      slug,
      signal_text: text,
      explanation: result.explanation,
      sentiment: result.sentiment,
      risk: result.riskLevel,
      timeframe: result.timeframe,
      glossary: result.glossary,
      coin_symbol: result.coin?.symbol || null,
    });
  } catch (e) {
    console.error("[discord] public signal save failed:", e);
  }
}

function buildEmbed(result: DecodeResult, slug: string) {
  const coin = result.coin ? ` ($${result.coin.symbol})` : "";
  const color = result.sentiment === "Bullish" ? 0x34d399 :
                result.sentiment === "Bearish" ? 0xf87171 : 0x9ca3af;

  const glossaryText = result.glossary.length > 0
    ? result.glossary.slice(0, 5).map((g) => `${g.term} — ${g.definition}`).join("\n")
    : "No jargon detected";

  return {
    title: `\u{1F50D} Signal Decoded${coin}`,
    description: result.explanation,
    color,
    fields: [
      { name: "\u{1F4CA} Sentiment", value: result.sentiment, inline: true },
      { name: "\u26A0\uFE0F Risk Level", value: result.riskLevel, inline: true },
      { name: "\u23F1 Timeframe", value: result.timeframe, inline: true },
    ],
    footer: { text: glossaryText },
    url: `https://signaldecoder.app/signal/${slug}`,
  };
}

function buildButton(slug: string) {
  return {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 5, // LINK
        label: "View full decode",
        url: `https://signaldecoder.app/signal/${slug}`,
      },
    ],
  };
}

// Send the follow-up message after deferred response
async function sendFollowup(appId: string, token: string, embed: object, button: object) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [embed],
      components: [button],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[discord] followup failed:", res.status, body);
  }
}

// Send an error follow-up
async function sendErrorFollowup(appId: string, token: string, msg: string) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: msg }),
  }).catch((e) => console.error("[discord] error followup failed:", e));
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify request signature
  const valid = await verifySignature(req, body);
  if (!valid) {
    console.error("[discord] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle Discord PING (endpoint verification)
  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG });
  }

  // Handle /decode command
  if (interaction.type === APPLICATION_COMMAND && interaction.data?.name === "decode") {
    const signal = interaction.data.options?.find((o: { name: string }) => o.name === "signal")?.value;
    const interactionToken = interaction.token;
    const appId = process.env.DISCORD_APP_ID;

    if (!signal || !appId) {
      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: { content: "Please provide a signal to decode." },
      });
    }

    // Respond immediately with "thinking..." then process in background
    // We need to return the deferred response quickly, then send follow-up
    const processAsync = async () => {
      try {
        console.log("[discord] decoding signal:", signal.slice(0, 100));
        const result = await decodeSignal(signal);
        const slug = generateSlug();
        await savePublicSignal(slug, signal, result);
        const embed = buildEmbed(result, slug);
        const button = buildButton(slug);
        await sendFollowup(appId, interactionToken, embed, button);
        console.log("[discord] decode complete, followup sent");
      } catch (e) {
        console.error("[discord] decode error:", e);
        await sendErrorFollowup(appId, interactionToken,
          "\u274C Failed to decode signal. Please try again.");
      }
    };

    // Fire and forget — the deferred response buys us 15 minutes
    processAsync();

    return NextResponse.json({ type: DEFERRED_CHANNEL_MESSAGE });
  }

  return NextResponse.json({ type: PONG });
}
