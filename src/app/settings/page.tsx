"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-set)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-set)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-set)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-set" x1="0" y1="0" x2="36" y2="36">
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

export default function SettingsPage() {
  const { session, isSubscribed, loading: authLoading } = useAuth();
  const [sharePublicly, setSharePublicly] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setSharePublicly(!!data.sharePublicly);
      setWeeklyDigest(data.weeklyDigest ?? true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) fetchSettings();
  }, [authLoading, fetchSettings]);

  async function saveSetting(key: string, value: boolean, setter: (v: boolean) => void) {
    if (!session) return;
    setSaving(true);
    setError("");
    setSaved(false);
    const prev = key === "sharePublicly" ? sharePublicly : weeklyDigest;
    setter(value);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        setter(prev);
        throw new Error("Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
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

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your SignalDecoder preferences.
          </p>
        </header>

        {authLoading || loading ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : !session ? (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Sign in required</h2>
            <Link
              href="/app"
              className="inline-block mt-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
            >
              Go to app
            </Link>
          </div>
        ) : (
          <>
            <section className="card p-5 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white mb-1">
                    Share decodes to public feed
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    When enabled, your decoded signals appear on the public{" "}
                    <Link href="/feed" className="text-cyan-400 hover:text-cyan-300">
                      feed
                    </Link>{" "}
                    anonymously — no usernames, email, or account info is ever shown.
                    Applies to past and future decodes.
                  </p>
                </div>
                <button
                  onClick={() => !saving && saveSetting("sharePublicly", !sharePublicly, setSharePublicly)}
                  disabled={saving}
                  role="switch"
                  aria-checked={sharePublicly}
                  className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors ${
                    sharePublicly
                      ? "bg-cyan-500 border-cyan-400"
                      : "bg-white/5 border-white/10"
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  <span
                    className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      sharePublicly ? "translate-x-[20px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {saved && (
                <p className="text-xs text-emerald-400 mt-3">
                  {sharePublicly ? "Your decodes are now shared publicly." : "Your decodes are now private."}
                </p>
              )}
              {error && (
                <p className="text-xs text-red-400 mt-3">{error}</p>
              )}
            </section>

            <div className="rounded-xl border border-white/5 p-4 bg-white/[0.02] mb-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-400">What gets shared:</strong> the original signal text
                (truncated), the plain English explanation, sentiment, risk, timeframe, and glossary.{" "}
                <strong className="text-gray-400">What stays private:</strong> your account, email,
                uploaded images, and any identifying info.
              </p>
            </div>

            <section className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white mb-1">
                    Weekly email digest
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Receive a weekly email every Monday with the top decoded signals
                    from the past week — sentiment, risk, and plain English breakdowns.
                  </p>
                </div>
                <button
                  onClick={() => !saving && saveSetting("weeklyDigest", !weeklyDigest, setWeeklyDigest)}
                  disabled={saving}
                  role="switch"
                  aria-checked={weeklyDigest}
                  className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors ${
                    weeklyDigest
                      ? "bg-cyan-500 border-cyan-400"
                      : "bg-white/5 border-white/10"
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  <span
                    className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      weeklyDigest ? "translate-x-[20px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </section>
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
