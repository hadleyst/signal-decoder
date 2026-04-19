import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

const systemPrompt = `You are a crypto signal decoder. The user will give you a crypto coin trending signal with price data. Analyze it and return a JSON response with these fields:

- "explanation": A plain English explanation of what this means for traders, written for someone who is not a crypto expert. 2-3 sentences.
- "sentiment": One of "Bullish", "Bearish", or "Neutral".
- "riskLevel": One of "Low", "Medium", or "High".
- "timeframe": The timeframe implied (e.g. "Short-term (hours)", "Medium-term (days-weeks)", "Long-term (months+)", "Not specified").
- "glossary": An array of objects with "term" and "definition" for any crypto jargon. Keep it to 2-3 terms max.

Return ONLY valid JSON, no markdown fences or extra text.`;

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

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(3)}`;
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export async function GET() {
  try {
    // Fetch trending coins from CoinGecko (free, no key required)
    const cgUrl = "https://api.coingecko.com/api/v3/search/trending";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    }

    const cgRes = await fetch(cgUrl, { cache: "no-store", headers });

    if (!cgRes.ok) {
      const body = await cgRes.text().catch(() => "");
      console.error(`CoinGecko trending API error: ${cgRes.status} ${cgRes.statusText}`, body);
      return NextResponse.json(
        { error: `Failed to fetch trending coins (HTTP ${cgRes.status}). Try again shortly.` },
        { status: 502 }
      );
    }

    const cgData = await cgRes.json();
    const coins = cgData.coins;

    if (!Array.isArray(coins) || coins.length === 0) {
      console.error("CoinGecko returned no coins. Response keys:", Object.keys(cgData));
      return NextResponse.json({ feed: [] });
    }

    // Take top 10 trending coins
    const items = coins.slice(0, 10);

    // Build a signal string for each coin and decode via Claude
    const results = await Promise.allSettled(
      items.map(async (entry: { item: Record<string, unknown> }): Promise<DecodedPost> => {
        const coin = entry.item;
        const data = (coin.data || {}) as Record<string, unknown>;
        const priceChange = data.price_change_percentage_24h as Record<string, number> | undefined;
        const pctUsd = priceChange?.usd;
        const price = data.price as number | undefined;
        const marketCap = data.market_cap as string | undefined;
        const content = data.content as { description?: string } | null;

        // Build a realistic signal string from the trending data
        const parts = [
          `$${coin.symbol} (${coin.name}) is trending on CoinGecko.`,
        ];
        if (price != null) parts.push(`Price: ${formatPrice(price)}.`);
        if (pctUsd != null) parts.push(`24h change: ${formatPct(pctUsd)}.`);
        if (marketCap) parts.push(`Market cap: ${marketCap}.`);
        if (coin.market_cap_rank) parts.push(`Rank #${coin.market_cap_rank}.`);
        if (content?.description) {
          parts.push(content.description.slice(0, 200));
        }

        const signalText = parts.join(" ");

        const decoded = await decodeHeadline(signalText);

        return {
          id: `cg-${coin.id}`,
          signal_text: signalText,
          source: "CoinGecko Trending",
          published_at: new Date().toISOString(),
          url: `https://www.coingecko.com/en/coins/${coin.slug || coin.id}`,
          coins: [{ code: String(coin.symbol), title: String(coin.name) }],
          explanation: decoded.explanation,
          sentiment: decoded.sentiment as DecodedPost["sentiment"],
          riskLevel: decoded.riskLevel as DecodedPost["riskLevel"],
          timeframe: decoded.timeframe,
          glossary: decoded.glossary || [],
        };
      })
    );

    // Log any decode failures
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(`${failures.length}/${results.length} decode(s) failed:`,
        failures.map((f) => (f as PromiseRejectedResult).reason?.message || (f as PromiseRejectedResult).reason)
      );
    }

    const feed = results
      .filter((r): r is PromiseFulfilledResult<DecodedPost> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({ feed });
  } catch (err) {
    console.error("Feed API unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to generate feed. Please try again." },
      { status: 500 }
    );
  }
}
