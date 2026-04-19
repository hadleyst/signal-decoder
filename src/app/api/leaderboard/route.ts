import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Top crypto symbols for extraction
const COINS: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", BNB: "BNB", XRP: "XRP",
  ADA: "Cardano", DOGE: "Dogecoin", AVAX: "Avalanche", DOT: "Polkadot",
  MATIC: "Polygon", POL: "Polygon", LINK: "Chainlink", UNI: "Uniswap",
  ATOM: "Cosmos", LTC: "Litecoin", FIL: "Filecoin", APT: "Aptos",
  ARB: "Arbitrum", OP: "Optimism", SUI: "Sui", SEI: "Sei", INJ: "Injective",
  TIA: "Celestia", NEAR: "NEAR", FTM: "Fantom", ALGO: "Algorand",
  ICP: "Internet Computer", HBAR: "Hedera", VET: "VeChain", SAND: "The Sandbox",
  MANA: "Decentraland", AXS: "Axie Infinity", CRV: "Curve", AAVE: "Aave",
  SNX: "Synthetix", COMP: "Compound", MKR: "Maker", SUSHI: "SushiSwap",
  PEPE: "Pepe", SHIB: "Shiba Inu", BONK: "Bonk", WIF: "Dogwifhat",
  JUP: "Jupiter", PYTH: "Pyth", ONDO: "Ondo", RENDER: "Render",
  FET: "Fetch.ai", TAO: "Bittensor", WLD: "Worldcoin", STRK: "Starknet",
  TRX: "Tron", TON: "Toncoin", ORDI: "Ordi", STX: "Stacks", IMX: "Immutable",
  PENDLE: "Pendle", ENA: "Ethena", W: "Wormhole", JTO: "Jito",
};

// Reverse map: lowercase name -> symbol
const NAME_TO_SYM: Record<string, string> = {};
for (const [sym, name] of Object.entries(COINS)) {
  NAME_TO_SYM[name.toLowerCase()] = sym;
}

function extractCoins(signalText: string | null, explanation: string): string[] {
  const found = new Set<string>();
  const text = `${signalText || ""} ${explanation}`;

  // Match $SYMBOL or SYMBOL/USDT or SYMBOL/BTC patterns
  const tickerRe = /\$([A-Z]{2,8})\b|([A-Z]{2,8})\/[A-Z]{2,8}/g;
  let m;
  while ((m = tickerRe.exec(text)) !== null) {
    const sym = m[1] || m[2];
    if (COINS[sym]) found.add(sym);
  }

  // Match known symbols as standalone words (case insensitive for names)
  const upper = text.toUpperCase();
  for (const sym of Object.keys(COINS)) {
    // Match as whole word in uppercase text
    const re = new RegExp(`\\b${sym}\\b`);
    if (re.test(upper)) found.add(sym);
  }

  // Match full coin names
  const lower = text.toLowerCase();
  for (const [name, sym] of Object.entries(NAME_TO_SYM)) {
    if (lower.includes(name)) found.add(sym);
  }

  return Array.from(found);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET() {
  try {
    const supabase = createServiceClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("decode_history")
      .select("signal_text, explanation, sentiment, created_at")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Leaderboard query error:", error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const rows = data || [];

    // Aggregate coin counts and sentiments
    const coinStats: Record<string, { count: number; bullish: number; bearish: number; neutral: number; name: string }> = {};

    // Aggregate daily counts
    const dayCounts: Record<number, number> = {};
    for (let d = 0; d < 7; d++) dayCounts[d] = 0;

    for (const row of rows) {
      // Daily count
      const dayOfWeek = new Date(row.created_at).getDay();
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

      // Coin extraction
      const coins = extractCoins(row.signal_text, row.explanation);
      for (const sym of coins) {
        if (!coinStats[sym]) {
          coinStats[sym] = { count: 0, bullish: 0, bearish: 0, neutral: 0, name: COINS[sym] || sym };
        }
        coinStats[sym].count++;
        if (row.sentiment === "Bullish") coinStats[sym].bullish++;
        else if (row.sentiment === "Bearish") coinStats[sym].bearish++;
        else coinStats[sym].neutral++;
      }
    }

    // Sort coins by count
    const topCoins = Object.entries(coinStats)
      .map(([symbol, stats]) => ({ symbol, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Find most active day
    const dailyBreakdown = Object.entries(dayCounts)
      .map(([day, count]) => ({ day: DAY_NAMES[Number(day)], dayIndex: Number(day), count }))
      .sort((a, b) => a.dayIndex - b.dayIndex);

    const mostActiveDay = dailyBreakdown.reduce(
      (best, d) => (d.count > best.count ? d : best),
      dailyBreakdown[0]
    );

    return NextResponse.json({
      topCoins,
      dailyBreakdown,
      mostActiveDay: mostActiveDay.day,
      mostActiveDayCount: mostActiveDay.count,
      totalDecodes: rows.length,
      uniqueCoins: Object.keys(coinStats).length,
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
