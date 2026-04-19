import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Decoded Coins — Crypto Signal Analysis | SignalDecoder",
  description: "Browse all crypto coins decoded on SignalDecoder. See signal counts, sentiment analysis, and plain English breakdowns.",
  alternates: { canonical: "https://signaldecoder.app/coins" },
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-coins)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-coins)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-coins)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-coins" x1="0" y1="0" x2="36" y2="36">
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

interface CoinRow {
  coin_symbol: string;
  count: number;
}

export default async function CoinsIndexPage() {
  const supabase = createServiceClient();

  // Get all coins with decode counts
  const { data, error } = await supabase
    .from("public_signals")
    .select("coin_symbol");

  const coins: CoinRow[] = [];
  if (!error && data) {
    const counts: Record<string, number> = {};
    for (const row of data) {
      if (row.coin_symbol) {
        counts[row.coin_symbol] = (counts[row.coin_symbol] || 0) + 1;
      }
    }
    for (const [symbol, count] of Object.entries(counts)) {
      coins.push({ coin_symbol: symbol, count });
    }
    coins.sort((a, b) => b.count - a.count);
  }

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/feed" className="text-sm text-gray-400 hover:text-white transition-colors">Feed</Link>
          <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition-colors">Leaderboard</Link>
          <Link href="/app" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors">
            Decode Signal
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">Browse</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Decoded Coins</h1>
          <p className="text-gray-400">All coins with decoded signals, sorted by most analyzed.</p>
        </header>

        {coins.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-400">No decoded signals yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {coins.map((c) => (
              <Link
                key={c.coin_symbol}
                href={`/coins/${c.coin_symbol.toLowerCase()}`}
                className="card p-4 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition-colors">
                    <span className="text-[11px] font-bold text-cyan-400">{c.coin_symbol.slice(0, 4)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{c.coin_symbol}</p>
                    <p className="text-xs text-gray-500">{c.count} decode{c.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">For educational purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}
