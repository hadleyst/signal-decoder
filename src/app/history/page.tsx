"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface GlossaryItem {
  term: string;
  definition: string;
}

interface HistoryEntry {
  id: string;
  signal_text: string | null;
  image_url: string | null;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  risk: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: GlossaryItem[];
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
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-hist)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-hist)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-hist)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-hist" x1="0" y1="0" x2="36" y2="36">
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

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches || matches.length === 0) return text;
  return matches.slice(0, 2).join(" ").trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { session, isSubscribed, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch history");
      }
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) {
      fetchHistory();
    }
  }, [authLoading, fetchHistory]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Top nav */}
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
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-sm text-gray-500">
            Your past signal decodes, most recent first.
          </p>
        </header>

        {/* Content states */}
        {authLoading || loading ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500">Loading history...</p>
          </div>
        ) : !session ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Sign in required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Sign in to view your decode history.
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
            <h2 className="text-lg font-semibold text-white mb-2">History is a Pro feature</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Upgrade to Pro to save all your decoded signals and access them from any device.
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
        ) : history.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">No decoded signals yet</h2>
            <p className="text-sm text-gray-400 mb-6">
              Your decode history will appear here.
            </p>
            <Link
              href="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Decode your first signal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const expanded = expandedIds.has(entry.id);
              const sentiment = sentimentConfig[entry.sentiment];
              const risk = riskConfig[entry.risk];
              const isImage = !!entry.image_url;

              return (
                <div key={entry.id} className="card overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(entry.id)}
                    className="w-full p-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Top row: date, type, expand chevron */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDate(entry.created_at)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="font-medium text-gray-400">
                          {isImage ? "Image" : "Text"}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>

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

                    {/* Preview explanation */}
                    {!expanded && (
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                        {firstTwoSentences(entry.explanation)}
                      </p>
                    )}
                  </button>

                  {/* Expanded details */}
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-5">
                      {entry.image_url && (
                        <div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Source Image
                          </h3>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.image_url}
                            alt="Signal"
                            className="w-full rounded-lg max-h-80 object-contain bg-black/30"
                          />
                        </div>
                      )}

                      {entry.signal_text && (
                        <div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Original Signal
                          </h3>
                          <p className="text-sm text-gray-400 font-mono leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5">
                            {entry.signal_text}
                          </p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Explanation
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {entry.explanation}
                        </p>
                      </div>

                      {entry.glossary && entry.glossary.length > 0 && (
                        <div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                            Key Terms
                          </h3>
                          <div className="space-y-2">
                            {entry.glossary.map((item) => (
                              <div key={item.term} className="flex gap-3">
                                <span className="shrink-0 mt-0.5 font-mono text-xs font-bold text-cyan-400 bg-cyan-400/10 rounded px-2 py-1 h-fit">
                                  {item.term}
                                </span>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                  {item.definition}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
