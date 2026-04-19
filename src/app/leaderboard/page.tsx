"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CoinStat {
  symbol: string;
  name: string;
  count: number;
  bullish: number;
  bearish: number;
  neutral: number;
}

interface DailyBreakdown {
  day: string;
  dayIndex: number;
  count: number;
}

interface LeaderboardData {
  topCoins: CoinStat[];
  dailyBreakdown: DailyBreakdown[];
  mostActiveDay: string;
  mostActiveDayCount: number;
  totalDecodes: number;
  uniqueCoins: number;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-lb)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-lb)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-lb)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-lb" x1="0" y1="0" x2="36" y2="36">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-xl font-bold tracking-tight text-white">
        Signal<span className="text-cyan-400">Decoder</span>
      </span>
    </Link>
  );
}

function SentimentBar({ bullish, bearish, neutral, total }: { bullish: number; bearish: number; neutral: number; total: number }) {
  if (total === 0) return null;
  const bPct = Math.round((bullish / total) * 100);
  const rPct = Math.round((bearish / total) * 100);
  const nPct = 100 - bPct - rPct;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/5">
        {bPct > 0 && <div className="bg-emerald-400" style={{ width: `${bPct}%` }} />}
        {nPct > 0 && <div className="bg-amber-400" style={{ width: `${nPct}%` }} />}
        {rPct > 0 && <div className="bg-red-400" style={{ width: `${rPct}%` }} />}
      </div>
      <div className="flex justify-between text-[10px] tracking-wide">
        <span className="text-emerald-400">{bPct}% Bull</span>
        {nPct > 0 && <span className="text-amber-400">{nPct}% Neutral</span>}
        <span className="text-red-400">{rPct}% Bear</span>
      </div>
    </div>
  );
}

function DailyChart({ breakdown, maxCount }: { breakdown: DailyBreakdown[]; maxCount: number }) {
  const peak = maxCount || 1;
  return (
    <div className="flex items-end gap-2 h-28">
      {breakdown.map((d) => (
        <div key={d.dayIndex} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500">{d.count}</span>
          <div
            className={`w-full rounded-t transition-all ${
              d.count === maxCount ? "bg-cyan-400" : "bg-white/10"
            }`}
            style={{ height: `${Math.max(4, (d.count / peak) * 80)}px` }}
          />
          <span className="text-[10px] text-gray-500">{d.day.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Nav */}
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/feed" className="text-sm text-gray-400 hover:text-white transition-colors">
            Feed
          </Link>
          <Link href="/glossary" className="text-sm text-gray-400 hover:text-white transition-colors">
            Glossary
          </Link>
          <Link
            href="/app"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
          >
            Decode Signal
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="header-glow mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Weekly <span className="text-cyan-400">Leaderboard</span>
          </h1>
          <p className="text-sm text-gray-500">
            What the community is decoding this week
          </p>
        </header>

        {/* Coinzilla ad slot */}
        <div className="ad-slot mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center min-h-[90px] flex items-center justify-center">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">Advertisement</span>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="dot-loader flex gap-2">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && (
          <div className="card p-6 text-center text-red-400">
            Failed to load leaderboard data. Try refreshing.
          </div>
        )}

        {data && (
          <div className="space-y-8 animate-fade-up">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{data.totalDecodes}</div>
                <div className="text-xs text-gray-500 mt-1">Decodes This Week</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{data.uniqueCoins}</div>
                <div className="text-xs text-gray-500 mt-1">Unique Coins</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{data.topCoins[0]?.symbol || "—"}</div>
                <div className="text-xs text-gray-500 mt-1">Top Coin</div>
              </div>
            </div>

            {/* Top Coins */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">&#9650;</span> Most Decoded Coins
              </h2>
              {data.topCoins.length === 0 ? (
                <div className="card p-6 text-center text-gray-500">
                  No decodes recorded this week yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topCoins.map((coin, i) => (
                    <div
                      key={coin.symbol}
                      className={`card p-4 ${i === 0 ? "card-highlight border-cyan-500/20" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-mono w-6 text-right ${
                              i === 0 ? "text-cyan-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-gray-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <Link href={`/coins/${coin.symbol.toLowerCase()}`} className="text-white font-bold hover:text-cyan-400 transition-colors">{coin.symbol}</Link>
                          <span className="text-gray-500 text-sm">{coin.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {coin.count} decode{coin.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="ml-9">
                        <SentimentBar
                          bullish={coin.bullish}
                          bearish={coin.bearish}
                          neutral={coin.neutral}
                          total={coin.count}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Most Active Day */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">&#9679;</span> Daily Activity
              </h2>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-400">Most active day</div>
                    <div className="text-xl font-bold text-white">{data.mostActiveDay}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{data.mostActiveDayCount}</div>
                    <div className="text-xs text-gray-500">decodes</div>
                  </div>
                </div>
                <DailyChart breakdown={data.dailyBreakdown} maxCount={data.mostActiveDayCount} />
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center">
        <p className="text-xs text-gray-600">
          Data refreshed on each visit. Coins extracted from decoded signals.
        </p>
      </footer>
    </div>
  );
}
