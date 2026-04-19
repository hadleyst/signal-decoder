"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface SavedEntry {
  id: string;
  slug: string | null;
  signal_text: string | null;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  risk: "Low" | "Medium" | "High";
  timeframe: string;
  coin_symbol: string | null;
  saved_at: string;
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
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-saved)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-saved)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-saved)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-saved" x1="0" y1="0" x2="36" y2="36">
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function SavedPage() {
  const { session, isSubscribed, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch("/api/saved", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 403) { setLoading(false); return; }
        throw new Error("Failed to fetch saved decodes");
      }
      const data = await res.json();
      setEntries(data.saved || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) fetchSaved();
  }, [authLoading, fetchSaved]);

  async function handleDelete(id: string) {
    if (!session) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/saved?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

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
          <h1 className="text-3xl font-bold text-white mb-2">Saved Decodes</h1>
          <p className="text-sm text-gray-500">
            Signals you bookmarked, most recent first.
          </p>
        </header>

        {authLoading || loading ? (
          <div className="card p-8 text-center">
            <div className="dot-loader flex gap-2 justify-center">
              <span /><span /><span />
            </div>
          </div>
        ) : !session ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Sign in required</h2>
            <p className="text-sm text-gray-400 mb-6">Sign in to view your saved decodes.</p>
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
            <h2 className="text-lg font-semibold text-white mb-2">Saved Decodes is a Pro feature</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Upgrade to Pro to bookmark decoded signals and access them anytime.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">No saved decodes yet</h2>
            <p className="text-sm text-gray-400 mb-6">
              Use the bookmark icon on any decoded signal to save it here.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Decode a signal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const sentiment = sentimentConfig[entry.sentiment];
              const risk = riskConfig[entry.risk];

              return (
                <article key={entry.id} className="card p-5 overflow-hidden">
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(entry.saved_at)}</span>
                      {entry.coin_symbol && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-700" />
                          <span className="font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded px-1.5 py-0.5">
                            {entry.coin_symbol}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove from saved"
                    >
                      {deletingId === entry.id ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Original signal */}
                  {entry.signal_text && (
                    <blockquote className="text-sm text-gray-300 font-mono leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
                      {entry.signal_text.length > 200
                        ? entry.signal_text.slice(0, 200) + "\u2026"
                        : entry.signal_text}
                    </blockquote>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sentiment?.bg} ${sentiment?.color}`}>
                      <span className="text-sm leading-none">{sentiment?.icon}</span>
                      {entry.sentiment}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${risk?.bg} ${risk?.color}`}>
                      {entry.risk} Risk
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
                      {entry.timeframe}
                    </span>
                  </div>

                  {/* Explanation */}
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {entry.explanation}
                  </p>

                  {/* Public page link */}
                  {entry.slug && (
                    <Link
                      href={`/signal/${entry.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors mt-3"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                      View public page
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
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
