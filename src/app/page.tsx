"use client";

import { useState } from "react";

interface GlossaryItem {
  term: string;
  definition: string;
}

interface DecodeResult {
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  riskLevel: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: GlossaryItem[];
}

const sentimentConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  Bullish: { label: "Bullish", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "\u2191" },
  Bearish: { label: "Bearish", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "\u2193" },
  Neutral: { label: "Neutral", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: "\u2194" },
};

const riskConfig: Record<string, { color: string; bg: string; bars: number }> = {
  Low: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", bars: 1 },
  Medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", bars: 2 },
  High: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", bars: 3 },
};

function RiskBars({ level }: { level: number }) {
  return (
    <div className="flex gap-1 justify-center mt-1.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 rounded-full transition-all ${
            i <= level
              ? level === 1
                ? "bg-emerald-400 h-3"
                : level === 2
                  ? "bg-amber-400 h-4"
                  : "bg-red-400 h-5"
              : "bg-white/10 h-3"
          }`}
        />
      ))}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center justify-center gap-3 mb-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="36" y2="36">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Signal<span className="text-cyan-400">Decoder</span>
      </h1>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 card loading-scan p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="dot-loader flex gap-2">
          <span /><span /><span />
        </div>
        <p className="text-sm text-gray-400 font-mono">Analyzing signal...</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [signal, setSignal] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDecode() {
    if (!signal.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: signal.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const sentiment = result ? sentimentConfig[result.sentiment] : null;
  const risk = result ? riskConfig[result.riskLevel] : null;

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="header-glow mb-12 text-center">
          <Logo />
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Paste a crypto signal or tweet and get a plain English breakdown.
          </p>
        </header>

        {/* Input */}
        <div className="space-y-3">
          <div className="card p-1">
            <textarea
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDecode();
              }}
              placeholder='Paste a signal... e.g. "BTC breaking out of the descending wedge on the 4H, RSI divergence confirmed. Targeting 72k, SL at 64.5k. 3x long."'
              rows={4}
              maxLength={2000}
              className="w-full bg-transparent px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none font-mono"
            />
          </div>

          <button
            onClick={handleDecode}
            disabled={loading || !signal.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
          >
            {loading ? "Analyzing..." : "Decode Signal"}
          </button>

          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono text-[10px]">{"\u2318"}Enter</kbd> to submit
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingState />}

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-4">
            {/* Explanation */}
            <section className="card p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-cyan-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Explanation
                </h2>
              </div>
              <p className="text-gray-300 leading-relaxed text-[15px]">
                {result.explanation}
              </p>
            </section>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3 animate-fade-up animate-fade-up-delay-1">
              {/* Sentiment */}
              <div className={`card-highlight rounded-xl border p-4 text-center ${sentiment?.bg}`}>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Sentiment
                </h2>
                <div className={`text-2xl mb-1 ${sentiment?.color}`}>
                  {sentiment?.icon}
                </div>
                <span className={`text-sm font-bold ${sentiment?.color}`}>
                  {result.sentiment}
                </span>
              </div>

              {/* Risk */}
              <div className={`card-highlight rounded-xl border p-4 text-center ${risk?.bg}`}>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Risk Level
                </h2>
                <RiskBars level={risk?.bars ?? 0} />
                <span className={`text-sm font-bold mt-1.5 inline-block ${risk?.color}`}>
                  {result.riskLevel}
                </span>
              </div>

              {/* Timeframe */}
              <div className="card-highlight rounded-xl border border-white/8 p-4 text-center">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Timeframe
                </h2>
                <div className="text-2xl mb-1 text-gray-400">
                  <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {result.timeframe}
                </span>
              </div>
            </div>

            {/* Glossary */}
            {result.glossary && result.glossary.length > 0 && (
              <section className="card p-5 animate-fade-up animate-fade-up-delay-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-cyan-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Key Terms
                  </h2>
                </div>
                <div className="space-y-3">
                  {result.glossary.map((item) => (
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
              </section>
            )}
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
