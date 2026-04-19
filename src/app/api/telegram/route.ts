/**
 * Telegram Bot Webhook for SignalDecoder
 *
 * SETUP:
 * 1. Create a bot via @BotFather on Telegram, get the token
 * 2. Set TELEGRAM_BOT_TOKEN env var in Vercel
 * 3. Register this webhook URL with Telegram by visiting (once, in a browser):
 *    https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://signaldecoder.app/api/telegram
 * 4. To verify it's registered:
 *    https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
 * 5. Send any crypto signal text to the bot — it will decode and reply.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

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

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (let i = 0; i < 6; i++) slug += chars[bytes[i] % chars.length];
  return slug;
}

interface DecodeResult {
  explanation: string;
  sentiment: string;
  riskLevel: string;
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
  coin?: { symbol: string; name: string } | null;
}

async function decodeSignal(text: string): Promise<DecodeResult> {
  console.log("[telegram] decoding signal, length:", text.length);
  const claude = getClaude();
  const message = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  console.log("[telegram] decode response:", raw.slice(0, 200));
  return JSON.parse(raw);
}

async function savePublicSignal(slug: string, signalText: string, result: DecodeResult) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("public_signals").insert({
      slug,
      signal_text: signalText,
      explanation: result.explanation,
      sentiment: result.sentiment,
      risk: result.riskLevel,
      timeframe: result.timeframe,
      glossary: result.glossary,
      coin_symbol: result.coin?.symbol || null,
    });
    if (error) console.error("[telegram] public signal save failed:", error.message);
    else console.log("[telegram] public signal saved:", slug);
  } catch (e) {
    console.error("[telegram] public signal save error:", e);
  }
}

// Escape special chars for Telegram MarkdownV2
function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function formatReply(result: DecodeResult, slug: string): string {
  const sentimentEmoji = result.sentiment === "Bullish" ? "\u{1F4C8}" :
                         result.sentiment === "Bearish" ? "\u{1F4C9}" : "\u{1F4CA}";
  const riskEmoji = result.riskLevel === "High" ? "\u26A0\uFE0F" :
                    result.riskLevel === "Medium" ? "\u{1F7E1}" : "\u2705";
  const coin = result.coin ? ` \\($${esc(result.coin.symbol)}\\)` : "";

  let msg = `\u{1F50D} *Signal Decoded*${coin}\n\n`;
  msg += `${sentimentEmoji} *Sentiment:* ${esc(result.sentiment)}\n`;
  msg += `${riskEmoji} *Risk:* ${esc(result.riskLevel)}\n`;
  msg += `\u23F1 *Timeframe:* ${esc(result.timeframe)}\n\n`;
  msg += `\u{1F4AC} *Plain English:*\n${esc(result.explanation)}\n`;

  if (result.glossary && result.glossary.length > 0) {
    msg += `\n\u{1F511} *Key Terms:*\n`;
    for (const item of result.glossary.slice(0, 5)) {
      msg += `\u2022 *${esc(item.term)}* \\- ${esc(item.definition)}\n`;
    }
  }

  msg += `\n\u{1F517} [View full decode](https://signaldecoder.app/signal/${slug})`;
  msg += `\n\n_Decoded by [SignalDecoder](https://signaldecoder\\.app)_`;

  return msg;
}

// Plain text fallback (no Markdown) in case formatting fails
function formatReplyPlain(result: DecodeResult, slug: string): string {
  const coin = result.coin ? ` ($${result.coin.symbol})` : "";
  let msg = `Signal Decoded${coin}\n\n`;
  msg += `Sentiment: ${result.sentiment}\n`;
  msg += `Risk: ${result.riskLevel}\n`;
  msg += `Timeframe: ${result.timeframe}\n\n`;
  msg += `Plain English:\n${result.explanation}\n`;

  if (result.glossary && result.glossary.length > 0) {
    msg += `\nKey Terms:\n`;
    for (const item of result.glossary.slice(0, 5)) {
      msg += `- ${item.term}: ${item.definition}\n`;
    }
  }

  msg += `\nView full decode: https://signaldecoder.app/signal/${slug}`;
  return msg;
}

async function sendTelegramMessage(chatId: number, text: string, parseMode?: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN not set");
    return false;
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: false,
  };
  if (parseMode) payload.parse_mode = parseMode;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.ok) {
    console.error("[telegram] sendMessage failed:", res.status, JSON.stringify(body));
    return false;
  }

  console.log("[telegram] message sent to chat", chatId);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log("[telegram] received update:", JSON.stringify(update).slice(0, 300));

    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      console.log("[telegram] skipping: no text or chat id");
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    console.log("[telegram] chat:", chatId, "text:", text.slice(0, 100));

    // Handle /start command
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Welcome to SignalDecoder!\n\nSend me any crypto trading signal, tweet, or TA post and I'll decode it into plain English.\n\nJust paste the signal text and I'll analyze the sentiment, risk level, timeframe, and explain any jargon.\n\nTry it - paste a signal now!"
      );
      return NextResponse.json({ ok: true });
    }

    // Ignore other commands
    if (text.startsWith("/")) {
      await sendTelegramMessage(chatId, "Send me a crypto signal to decode - just paste the text!");
      return NextResponse.json({ ok: true });
    }

    // Send "typing" indicator
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      }).catch((e) => console.error("[telegram] typing indicator failed:", e));
    }

    // Decode the signal
    console.log("[telegram] starting decode for chat", chatId);
    const result = await decodeSignal(text);
    console.log("[telegram] decode complete:", result.sentiment, result.riskLevel);

    // Save as public signal
    const slug = generateSlug();
    await savePublicSignal(slug, text, result);

    // Send formatted reply — try MarkdownV2 first, fall back to plain text
    const reply = formatReply(result, slug);
    const sent = await sendTelegramMessage(chatId, reply, "MarkdownV2");

    if (!sent) {
      console.log("[telegram] MarkdownV2 failed, retrying with plain text");
      const plain = formatReplyPlain(result, slug);
      const sentPlain = await sendTelegramMessage(chatId, plain);
      if (!sentPlain) {
        console.error("[telegram] plain text fallback also failed for chat", chatId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[telegram] webhook error:", e instanceof Error ? e.message : e);
    console.error("[telegram] stack:", e instanceof Error ? e.stack : "no stack");
    return NextResponse.json({ ok: true });
  }
}
