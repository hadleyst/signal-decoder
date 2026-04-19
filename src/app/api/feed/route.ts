import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const systemPrompt = `You are a crypto signal decoder. The user will give you a crypto news headline or signal. Analyze it and return a JSON response with these fields:

- "explanation": A plain English explanation of what this means for traders, written for someone who is not a crypto expert. 2-3 sentences.
- "sentiment": One of "Bullish", "Bearish", or "Neutral".
- "riskLevel": One of "Low", "Medium", or "High".
- "timeframe": The timeframe implied (e.g. "Short-term (hours)", "Medium-term (days-weeks)", "Long-term (months+)", "Not specified").
- "glossary": An array of objects with "term" and "definition" for any crypto jargon. Keep it to 2-3 terms max.

Return ONLY valid JSON, no markdown fences or extra text.`;

interface CoinGeckoNewsItem {
  title: string;
  description: string;
  url: string;
  thumb_2x: string;
  created_at: number; // unix timestamp
  author: string;
  news_site: string;
}

interface DecodedPost {
  id: string;
  signal_text: string;
  source: string;
  published_at: string;
  url: string;
  coins: Array<{ code: string; title: string }>;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  riskLevel: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
}

async function decodeHeadline(text: string): Promise<{
  explanation: string;
  sentiment: string;
  riskLevel: string;
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
}> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(raw);
}

export async function GET() {
  try {
    // Fetch trending crypto news from CoinGecko
    const cgUrl = "https://api.coingecko.com/api/v3/news";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    }

    const cgRes = await fetch(cgUrl, { cache: "no-store", headers });

    if (!cgRes.ok) {
      console.error("CoinGecko news API error:", cgRes.status, await cgRes.text().catch(() => ""));
      return NextResponse.json(
        { error: "Failed to fetch crypto news. The news API may be temporarily unavailable." },
        { status: 502 }
      );
    }

    const cgData = await cgRes.json();
    const articles: CoinGeckoNewsItem[] = (cgData.data || cgData || []).slice(0, 10);

    if (articles.length === 0) {
      return NextResponse.json({ feed: [] });
    }

    // Decode each article via Claude (parallel)
    const results = await Promise.allSettled(
      articles.map(async (article): Promise<DecodedPost> => {
        const decoded = await decodeHeadline(article.title);
        return {
          id: article.url || article.title,
          signal_text: article.title,
          source: article.news_site || article.author || "Unknown",
          published_at: typeof article.created_at === "number"
            ? new Date(article.created_at * 1000).toISOString()
            : String(article.created_at),
          url: article.url,
          coins: [],
          explanation: decoded.explanation,
          sentiment: decoded.sentiment as DecodedPost["sentiment"],
          riskLevel: decoded.riskLevel as DecodedPost["riskLevel"],
          timeframe: decoded.timeframe,
          glossary: decoded.glossary || [],
        };
      })
    );

    const feed = results
      .filter((r): r is PromiseFulfilledResult<DecodedPost> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({ feed });
  } catch (err) {
    console.error("Feed API error:", err);
    return NextResponse.json(
      { error: "Failed to generate feed. Please try again." },
      { status: 500 }
    );
  }
}
