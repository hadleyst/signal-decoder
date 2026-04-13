"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface PaywallProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function Paywall({ onSignIn, onSignUp }: PaywallProps) {
  const { session } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleSubscribe() {
    if (!session) {
      onSignUp();
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Checkout creation failed
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="mt-8 card p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">
        You&apos;ve used all 5 free decodes
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        Subscribe for unlimited signal decoding.
      </p>

      <button
        onClick={handleSubscribe}
        disabled={checkoutLoading}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/20 mb-3"
      >
        {checkoutLoading ? "Redirecting to checkout..." : "Subscribe \u2014 $19/month"}
      </button>

      {!session && (
        <button
          onClick={onSignIn}
          className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
        >
          Already have an account? Sign in
        </button>
      )}
    </div>
  );
}
