"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface ReferralData {
  code: string;
  url: string;
  referralCount: number;
  freeMonthsEarned: number;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-ref)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-ref)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-ref)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-ref" x1="0" y1="0" x2="36" y2="36">
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

export default function ReferralPage() {
  const { session, isSubscribed, loading: authLoading } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchReferral = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch("/api/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 403) { setLoading(false); return; }
        throw new Error("Failed to fetch referral data");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) fetchReferral();
  }, [authLoading, fetchReferral]);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }

  function shareOnTwitter() {
    if (!data) return;
    const text = encodeURIComponent(
      `I've been using SignalDecoder to translate confusing crypto signals into plain English. Try it with my link:`
    );
    const url = encodeURIComponent(data.url);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
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

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Referrals</h1>
          <p className="text-sm text-gray-500">
            Share your link — get one free month for every friend who subscribes.
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
              Sign in to get your referral link.
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
            <h2 className="text-lg font-semibold text-white mb-2">Referrals are a Pro feature</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Upgrade to Pro to get your referral link and earn free months.
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
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Signups
                </p>
                <p className="text-3xl font-bold text-white">{data.referralCount}</p>
              </div>
              <div className="card p-5 text-center border-cyan-500/20 bg-cyan-500/[0.03]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Free months earned
                </p>
                <p className="text-3xl font-bold text-cyan-400">{data.freeMonthsEarned}</p>
              </div>
            </div>

            {/* Link */}
            <section className="card p-5 mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Your referral link
              </h2>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-cyan-300 overflow-x-auto whitespace-nowrap">
                  {data.url}
                </div>
                <button
                  onClick={copyLink}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={shareOnTwitter}
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X / Twitter
              </button>
            </section>

            {/* How it works */}
            <section className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                How it works
              </h2>
              <ol className="space-y-3">
                {[
                  "Share your unique link with friends",
                  "They sign up and subscribe to Pro",
                  "You get one free month credited to your subscription",
                  "Credit applies to your next invoice automatically",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-300">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : null}
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">
          For educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
