import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import FeedList, { type FeedEntry } from "@/components/FeedList";

// Revalidate every 5 minutes — fresh enough for a feed, cheap to serve
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Crypto Signal Feed: Real Signals Explained in Plain English | SignalDecoder",
  description:
    "Live feed of crypto trading signals and TA breakdowns explained in plain English. See sentiment, risk level, and glossary for real signals posted by traders.",
  keywords: [
    "crypto signal explained",
    "crypto TA breakdown",
    "crypto signals explained",
    "crypto trading signals",
    "technical analysis crypto",
    "crypto signal feed",
  ],
  openGraph: {
    title: "Crypto Signal Feed — Plain English TA Breakdowns",
    description:
      "Real crypto signals, decoded. Live feed of sentiment, risk, and jargon breakdowns for crypto trading posts.",
    type: "website",
    url: "https://signaldecoder.app/feed",
    siteName: "SignalDecoder",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Signal Feed — Plain English TA Breakdowns",
    description:
      "Real crypto signals, decoded. Live feed of sentiment, risk, and jargon breakdowns for crypto trading posts.",
  },
  alternates: {
    canonical: "https://signaldecoder.app/feed",
  },
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
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
    </div>
  );
}

async function fetchFeed(): Promise<FeedEntry[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("decode_history")
      .select("id, signal_text, image_url, explanation, sentiment, risk, timeframe, glossary, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error("Feed fetch failed:", error);
      return [];
    }

    // Anonymize: never expose image URLs or user_id. Just a boolean flag.
    return data.map((row): FeedEntry => ({
      id: row.id,
      signal_text: row.signal_text,
      has_image: !!row.image_url,
      explanation: row.explanation,
      sentiment: row.sentiment as FeedEntry["sentiment"],
      risk: row.risk as FeedEntry["risk"],
      timeframe: row.timeframe,
      glossary: Array.isArray(row.glossary) ? row.glossary : [],
      created_at: row.created_at,
    }));
  } catch (e) {
    console.error("Feed fetch error:", e);
    return [];
  }
}

export default async function FeedPage() {
  const entries = await fetchFeed();

  // JSON-LD: ItemList of public crypto signal breakdowns
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Crypto Signal Feed",
    description: "Latest public crypto signals decoded into plain English.",
    url: "https://signaldecoder.app/feed",
    numberOfItems: entries.length,
    itemListElement: entries.slice(0, 10).map((e, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Article",
        headline: `${e.sentiment} signal: ${e.timeframe}`,
        description: e.explanation.slice(0, 200),
        datePublished: e.created_at,
      },
    })),
  };

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
        >
          Try the decoder
        </Link>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
            Live feed
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Crypto signals, explained in plain English
          </h1>
          <p className="text-gray-400 leading-relaxed">
            Real crypto trading signals decoded — sentiment, risk, and jargon broken down.
            All entries are anonymous; no usernames, emails, or identifying info.
          </p>
        </header>

        <FeedList entries={entries} />

        {entries.length > 0 && (
          <div className="mt-12 card p-6 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Got a signal to decode?
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
          For educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
