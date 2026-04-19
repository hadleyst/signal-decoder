"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface CoinTag {
  code: string;
  title: string;
}

interface FeedPost {
  id: string;
  signal_text: string;
  source: string;
  published_at: string;
  url: string;
  coins: CoinTag[];
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  riskLevel: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
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

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-feed)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-feed)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-feed)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-feed" x1="0" y1="0" x2="36" y2="36">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-bold tracking-tight text-white">
        Signal<span className="text-cyan-400">Decoder</span>
      </span>
    </Link>
  );
}

const FREE_VISIBLE = 3;

export default function FeedPage() {
  const { isSubscribed, loading: authLoading } = useAuth();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function fetchFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetch("/api/feed")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load feed");
        return r.json();
      })
      .then((data) => {
        setFeed(data.feed || []);
        setExpandedIds(new Set());
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => { fetchFeed(); }, []);

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleFeed = isSubscribed ? feed : feed.slice(0, FREE_VISIBLE);
  const gatedCount = isSubscribed ? 0 : Math.max(0, feed.length - FREE_VISIBLE);

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Nav */}
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Leaderboard
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

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
            Live feed
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Trending crypto signals, decoded
          </h1>
          <p className="text-gray-400 leading-relaxed">
            Hot crypto news auto-decoded with sentiment, risk, and plain English explanations.
          </p>
        </header>

        {/* Refresh bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-gray-500">
            {feed.length > 0 && !loading
              ? `${feed.length} signals decoded`
              : "\u00A0"}
          </p>
          <button
            onClick={() => fetchFeed(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            {refreshing ? "Decoding..." : "Refresh Feed"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card p-12 text-center space-y-4">
            <div className="dot-loader flex gap-2 justify-center">
              <span /><span /><span />
            </div>
            <p className="text-sm text-gray-500">
              Fetching and decoding trending signals...
            </p>
            <p className="text-xs text-gray-600">
              This may take a moment while each signal is analyzed.
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card p-6 text-center border-red-500/20">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={() => fetchFeed()}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Feed cards */}
        {!loading && !error && feed.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-400">
              No signals available right now. Try refreshing in a few minutes.
            </p>
          </div>
        )}

        {!loading && visibleFeed.length > 0 && (
          <div className="space-y-3">
            {visibleFeed.map((post) => {
              const expanded = expandedIds.has(post.id);
              const sentiment = sentimentConfig[post.sentiment];
              const risk = riskConfig[post.riskLevel];

              return (
                <article key={post.id} className="card overflow-hidden animate-fade-up">
                  <div className="p-5">
                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span>{timeAgo(post.published_at)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span className="text-gray-400">{post.source}</span>
                    </div>

                    {/* Original signal */}
                    <blockquote className="text-sm text-gray-300 font-mono leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
                      {post.signal_text}
                    </blockquote>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sentiment?.bg} ${sentiment?.color}`}>
                        <span className="text-sm leading-none">{sentiment?.icon}</span>
                        {post.sentiment}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${risk?.bg} ${risk?.color}`}>
                        {post.riskLevel} Risk
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
                        {post.timeframe}
                      </span>
                    </div>

                    {/* Coin tags */}
                    {post.coins.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.coins.map((coin) => (
                          <span
                            key={coin.code}
                            className="text-[10px] font-bold tracking-wide text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded px-2 py-0.5"
                          >
                            {coin.code}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Explanation (always visible) */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-2">
                      {post.explanation}
                    </p>

                    {/* Expand for glossary */}
                    {post.glossary.length > 0 && !expanded && (
                      <button
                        onClick={() => toggle(post.id)}
                        className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                      >
                        Key terms
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expanded glossary */}
                  {expanded && post.glossary.length > 0 && (
                    <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Key Terms
                      </h3>
                      <div className="space-y-2">
                        {post.glossary.map((item, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="shrink-0 mt-0.5 font-mono text-xs font-bold text-cyan-400 bg-cyan-400/10 rounded px-2 py-1 h-fit">
                              {item.term}
                            </span>
                            <p className="text-sm text-gray-400 leading-relaxed">{item.definition}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => toggle(post.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1"
                      >
                        Collapse
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Pro gate */}
        {!loading && !authLoading && gatedCount > 0 && (
          <div className="mt-6 card card-highlight p-6 text-center border-cyan-500/20">
            <div className="text-2xl mb-2">&#128274;</div>
            <h2 className="text-lg font-semibold text-white mb-2">
              {gatedCount} more decoded signal{gatedCount !== 1 ? "s" : ""} available
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Upgrade to Pro to see the full decoded feed, unlimited signal decodes, history, and more.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* CTA */}
        {!loading && feed.length > 0 && (
          <div className="mt-12 card p-6 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Got your own signal to decode?
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Paste any crypto tweet, signal, or chart and get your own plain English breakdown.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Decode a signal free
            </Link>
          </div>
        )}
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">
          News sourced from CryptoPanic. Decodes are AI-generated and for educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
