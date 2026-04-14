"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface WatchlistItem {
  symbol: string;
  name: string | null;
  added_at: string;
}

const POPULAR_COINS: Array<{ symbol: string; name: string }> = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-wl)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-wl)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-wl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-wl" x1="0" y1="0" x2="36" y2="36">
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

export default function WatchlistPage() {
  const { session, isSubscribed, loading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/watchlist", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 403) { setLoading(false); return; }
        throw new Error("Failed to fetch watchlist");
      }
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch watchlist");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) fetchWatchlist();
  }, [authLoading, fetchWatchlist]);

  async function addCoin(symbol: string, name: string | null) {
    if (!session) return;
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ symbol: sym, name: name || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add");
      }
      setNewSymbol("");
      setNewName("");
      await fetchWatchlist();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCoin(symbol: string) {
    if (!session) return;
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  const watchedSymbols = new Set(watchlist.map((w) => w.symbol));

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span className="text-sm">Back to app</span>
        </Link>
        <Logo />
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Watchlist</h1>
          <p className="text-sm text-gray-500">
            Keep track of the coins you care about.
          </p>
        </header>

        {authLoading || loading ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : !session ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Sign in required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Sign in to manage your watchlist.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Go to app
            </Link>
          </div>
        ) : !isSubscribed ? (
          <div className="card p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Watchlist is a Pro feature</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Upgrade to Pro to track your favorite coins across devices.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <>
            {/* Add form */}
            <section className="card p-5 mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Add a coin
              </h2>
              <form
                onSubmit={(e) => { e.preventDefault(); addCoin(newSymbol, newName); }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="Symbol (e.g. BTC)"
                  maxLength={20}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 uppercase"
                />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (optional)"
                  maxLength={60}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40"
                />
                <button
                  type="submit"
                  disabled={submitting || !newSymbol.trim()}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Add
                </button>
              </form>

              {/* Popular quick-add */}
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Popular
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COINS.map((c) => {
                    const already = watchedSymbols.has(c.symbol);
                    return (
                      <button
                        key={c.symbol}
                        onClick={() => !already && addCoin(c.symbol, c.name)}
                        disabled={already}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          already
                            ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300"
                        }`}
                      >
                        {already ? "\u2713 " : "+ "}{c.symbol}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* List */}
            {watchlist.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-gray-400">
                  Your watchlist is empty. Add a coin above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-2">
                  {watchlist.length} coin{watchlist.length === 1 ? "" : "s"} watched
                </p>
                {watchlist.map((item) => (
                  <div
                    key={item.symbol}
                    className="card p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-cyan-400">
                          {item.symbol.slice(0, 4)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{item.symbol}</p>
                        {item.name && (
                          <p className="text-xs text-gray-500 truncate">{item.name}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCoin(item.symbol)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">
          For educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
