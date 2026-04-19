import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";

interface SignalRow {
  slug: string;
  signal_text: string | null;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  risk: "Low" | "Medium" | "High";
  timeframe: string;
  coin_symbol: string;
  created_at: string;
}

const sentimentConfig: Record<string, { color: string; bg: string; icon: string }> = {
  Bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "\u2191" },
  Bearish: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "\u2193" },
  Neutral: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: "\u2194" },
};

const riskConfig: Record<string, { color: string; bg: string }> = {
  Low: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  High: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-cp)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-cp)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-cp)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-cp" x1="0" y1="0" x2="36" y2="36">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-bold tracking-tight text-white">
        Signal<span className="text-cyan-400">Decoder</span>
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function getCoinData(symbol: string, page: number) {
  const supabase = createServiceClient();
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data, error, count } = await supabase
    .from("public_signals")
    .select("slug, signal_text, explanation, sentiment, risk, timeframe, coin_symbol, created_at", { count: "exact" })
    .eq("coin_symbol", symbol)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error || !data || data.length === 0) return null;

  // Sentiment breakdown (from all signals, not just this page)
  const { data: allSentiments } = await supabase
    .from("public_signals")
    .select("sentiment")
    .eq("coin_symbol", symbol);

  let bullish = 0, bearish = 0, neutral = 0;
  if (allSentiments) {
    for (const s of allSentiments) {
      if (s.sentiment === "Bullish") bullish++;
      else if (s.sentiment === "Bearish") bearish++;
      else neutral++;
    }
  }
  const total = bullish + bearish + neutral;

  return {
    signals: data as SignalRow[],
    total: count || total,
    bullish, bearish, neutral,
    totalSentiment: total,
    lastDecoded: data[0]?.created_at,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ symbol: string }> },
): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const title = `${sym} Signals Decoded \u2014 ${sym} Signal Analysis | SignalDecoder`;
  const description = `See all decoded crypto signals for ${sym}. Sentiment analysis, risk assessment, and plain English breakdowns.`;
  const url = `https://signaldecoder.app/coins/${symbol.toLowerCase()}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url, siteName: "SignalDecoder" },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  };
}

export default async function CoinPage(
  { params, searchParams }: { params: Promise<{ symbol: string }>; searchParams: Promise<{ page?: string }> },
) {
  const { symbol } = await params;
  const { page: pageParam } = await searchParams;
  const sym = symbol.toUpperCase();
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const data = await getCoinData(sym, page);
  if (!data) notFound();

  const { signals, total, bullish, bearish, neutral, totalSentiment, lastDecoded } = data;
  const totalPages = Math.ceil(total / 20);

  const bPct = totalSentiment > 0 ? Math.round((bullish / totalSentiment) * 100) : 0;
  const rPct = totalSentiment > 0 ? Math.round((bearish / totalSentiment) * 100) : 0;
  const nPct = 100 - bPct - rPct;

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/coins" className="text-sm text-gray-400 hover:text-white transition-colors">All Coins</Link>
          <Link href="/feed" className="text-sm text-gray-400 hover:text-white transition-colors">Feed</Link>
          <Link href="/app" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors">
            Decode Signal
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Summary card */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-cyan-400">{sym.slice(0, 4)}</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{sym}</h1>
              <p className="text-sm text-gray-500">{total} decoded signal{total !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Sentiment breakdown */}
          {totalSentiment > 0 && (
            <div className="mb-4">
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-white/5 mb-2">
                {bPct > 0 && <div className="bg-emerald-400" style={{ width: `${bPct}%` }} />}
                {nPct > 0 && <div className="bg-amber-400" style={{ width: `${nPct}%` }} />}
                {rPct > 0 && <div className="bg-red-400" style={{ width: `${rPct}%` }} />}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">{bPct}% Bullish</span>
                {nPct > 0 && <span className="text-amber-400">{nPct}% Neutral</span>}
                <span className="text-red-400">{rPct}% Bearish</span>
              </div>
            </div>
          )}

          {lastDecoded && (
            <p className="text-xs text-gray-500">Last decoded: {formatDate(lastDecoded)}</p>
          )}
        </div>

        {/* Signal cards */}
        <div className="space-y-3">
          {signals.map((s) => {
            const sentiment = sentimentConfig[s.sentiment];
            const risk = riskConfig[s.risk];

            return (
              <article key={s.slug} className="card p-5">
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span>{formatDate(s.created_at)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sentiment?.bg} ${sentiment?.color}`}>
                    <span className="text-sm leading-none">{sentiment?.icon}</span>
                    {s.sentiment}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${risk?.bg} ${risk?.color}`}>
                    {s.risk} Risk
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
                    {s.timeframe}
                  </span>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed mb-3">
                  {s.explanation.length > 200 ? s.explanation.slice(0, 200) + "\u2026" : s.explanation}
                </p>

                <Link
                  href={`/signal/${s.slug}`}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                >
                  View full decode
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </article>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <Link
                href={`/coins/${symbol.toLowerCase()}?page=${page - 1}`}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/coins/${symbol.toLowerCase()}?page=${page + 1}`}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">For educational purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}
