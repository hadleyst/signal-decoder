import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { signal } = await req.json();

  if (!signal || typeof signal !== "string" || signal.trim().length === 0) {
    return NextResponse.json({ error: "No signal provided" }, { status: 400 });
  }

  if (signal.length > 2000) {
    return NextResponse.json(
      { error: "Signal too long (max 2000 characters)" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are a crypto signal decoder. The user will paste a crypto trading signal, tweet, or message. Analyze it and return a JSON response with these fields:

- "explanation": A plain English explanation of what the signal means, written for someone who is not a crypto expert. 2-4 sentences.
- "sentiment": One of "Bullish", "Bearish", or "Neutral".
- "riskLevel": One of "Low", "Medium", or "High", based on the aggressiveness of the signal.
- "timeframe": The timeframe mentioned or implied (e.g. "Short-term (hours)", "Medium-term (days-weeks)", "Long-term (months+)"). If none is mentioned, use "Not specified".
- "glossary": An array of objects with "term" and "definition" keys for any technical, crypto-specific, or jargon terms used in the signal. Only include terms that a general audience wouldn't know.

Return ONLY valid JSON, no markdown fences or extra text.`;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: signal }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text);

      return NextResponse.json(parsed);
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
