import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  // For authenticated users, verify they have an active subscription
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .single();

      const isSubscribed = data?.status === "active" &&
        new Date(data.current_period_end) > new Date();

      if (!isSubscribed) {
        return NextResponse.json(
          { error: "Active subscription required" },
          { status: 403 }
        );
      }
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
