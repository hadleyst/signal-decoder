"use client";

import { useState } from "react";

export interface FeedEntry {
  id: string;
  signal_text: string | null;
  has_image: boolean;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  risk: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
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

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function truncate(text: string, max = 100): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "\u2026";
}

export default function FeedList({ entries }: { entries: FeedEntry[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-400">
          No public decodes yet. Be the first — enable public sharing in{" "}
          <a href="/settings" className="text-cyan-400 hover:text-cyan-300">
            Settings
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const expanded = expandedIds.has(entry.id);
        const sentiment = sentimentConfig[entry.sentiment];
        const risk = riskConfig[entry.risk];
        const displaySignal = entry.signal_text
          ? truncate(entry.signal_text, 100)
          : entry.has_image
            ? "[Chart screenshot]"
            : "[No signal text]";

        return (
          <article key={entry.id} className="card overflow-hidden">
            <div className="p-5">
              {/* Top row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span>{timeAgo(entry.created_at)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span className="font-medium text-gray-400">
                  {entry.has_image ? "Image" : "Text"}
                </span>
              </div>

              {/* Original signal */}
              <blockquote className="text-sm text-gray-300 font-mono leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
                {displaySignal}
              </blockquote>

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

              {!expanded && (
                <button
                  onClick={() => toggle(entry.id)}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                >
                  See full breakdown
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Expanded */}
            {expanded && (
              <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-5">
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Explanation
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{entry.explanation}</p>
                </div>

                {entry.glossary && entry.glossary.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                      Key Terms
                    </h3>
                    <div className="space-y-2">
                      {entry.glossary.map((item, i) => (
                        <div key={`${entry.id}-${i}`} className="flex gap-3">
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

                <button
                  onClick={() => toggle(entry.id)}
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
  );
}
