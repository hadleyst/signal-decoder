"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import Paywall from "@/components/Paywall";
import { getUsageCount, incrementUsage, hasReachedLimit, FREE_LIMIT } from "@/lib/usage";

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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function Home() {
  const { session, isSubscribed, loading: authLoading, signOut, refreshSubscription } = useAuth();
  const [signal, setSignal] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [resultImagePreview, setResultImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate usage count from localStorage
  useEffect(() => {
    setUsageCount(getUsageCount());
  }, []);

  // Handle checkout success redirect
  const handleCheckoutReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutSuccess(true);
      window.history.replaceState({}, "", "/");
      // Poll for subscription activation (webhook may be slightly delayed)
      for (let i = 0; i < 5; i++) {
        await refreshSubscription();
        await new Promise((r) => setTimeout(r, 1500));
      }
      setCheckoutSuccess(false);
    }
  }, [refreshSubscription]);

  useEffect(() => {
    handleCheckoutReturn();
  }, [handleCheckoutReturn]);

  function handleFile(file: File) {
    setError("");
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("Only JPG and PNG images are supported");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImagePreview(dataUrl);
      setImageData(base64);
      setImageMediaType(file.type);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageData(null);
    setImageMediaType(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDecode() {
    const hasText = mode === "text" && signal.trim().length > 0;
    const hasImage = mode === "image" && imageData !== null;
    if (!hasText && !hasImage) return;

    // Check if user can decode
    if (!isSubscribed && hasReachedLimit()) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setResultImagePreview(null);
    setShowPaywall(false);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const body = hasImage
        ? { image: imageData, mediaType: imageMediaType }
        : { signal: signal.trim() };

      const res = await fetch("/api/decode", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setResult(data);
      if (hasImage) {
        setResultImagePreview(imagePreview);
      }

      // Increment usage for non-subscribers
      if (!isSubscribed) {
        const newCount = incrementUsage();
        setUsageCount(newCount);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const sentiment = result ? sentimentConfig[result.sentiment] : null;
  const risk = result ? riskConfig[result.riskLevel] : null;
  const showUsageCounter = !isSubscribed && !authLoading;

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Auth bar */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4 flex justify-end">
        {authLoading ? null : session ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 truncate max-w-[180px]">{session.user.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setAuthModalTab("signin"); setShowAuthModal(true); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign in
          </button>
        )}
      </div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="header-glow mb-12 text-center">
          <Logo />
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Paste a crypto signal or tweet and get a plain English breakdown.
          </p>
        </header>

        {/* Checkout success banner */}
        {checkoutSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 text-center">
            Payment successful! Activating your subscription...
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
            <button
              onClick={() => setMode("text")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "text" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setMode("image")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === "image" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Image
            </button>
          </div>

          {mode === "text" ? (
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
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              className={`card p-4 transition-colors ${dragOver ? "border-cyan-500/50 bg-cyan-500/5" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Uploaded signal"
                    className="w-full rounded-lg max-h-80 object-contain bg-black/30"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-black/90 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-10 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-600">JPG or PNG (max 5MB)</p>
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleDecode}
            disabled={loading || (mode === "text" ? !signal.trim() : !imageData)}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : "Decode Signal"}
          </button>

          <div className="flex items-center justify-between">
            {mode === "text" ? (
              <p className="text-xs text-gray-600">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono text-[10px]">{"\u2318"}Enter</kbd> to submit
              </p>
            ) : <span />}
            {showUsageCounter && (
              <p className="text-xs text-gray-600">
                {usageCount} of {FREE_LIMIT} free decodes used
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Paywall */}
        {showPaywall && (
          <Paywall
            onSignIn={() => { setAuthModalTab("signin"); setShowAuthModal(true); }}
            onSignUp={() => { setAuthModalTab("signup"); setShowAuthModal(true); }}
          />
        )}

        {/* Loading */}
        {loading && <LoadingState />}

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-4">
            {/* Image preview (only when result was from an image) */}
            {resultImagePreview && (
              <section className="card p-3 animate-fade-up">
                <div className="flex items-center gap-2 mb-3 px-2 pt-1">
                  <div className="w-1 h-4 rounded-full bg-cyan-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Source Image
                  </h2>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultImagePreview}
                  alt="Analyzed signal"
                  className="w-full rounded-lg max-h-96 object-contain bg-black/30"
                />
              </section>
            )}

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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
