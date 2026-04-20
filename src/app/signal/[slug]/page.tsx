import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";

interface SignalRow {
  slug: string;
  signal_text: string | null;
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  risk: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: Array<{ term: string; definition: string }>;
  coin_symbol: string | null;
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
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-sig)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-sig)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-sig)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-sig" x1="0" y1="0" x2="36" y2="36">
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

async function getSignal(slug: string): Promise<SignalRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("public_signals")
    .select("slug, signal_text, explanation, sentiment, risk, timeframe, glossary, coin_symbol, created_at")
    .eq("slug", slug)
    .single();
  if (error) {
    console.error(`Signal page lookup failed for slug="${slug}":`, error.message, error.details);
    return null;
  }
  if (!data) {
    console.error(`Signal page: no row found for slug="${slug}"`);
    return null;
  }
  return data as SignalRow;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const signal = await getSignal(slug);
  if (!signal) {
    return { title: "Signal Not Found | SignalDecoder" };
  }
  const coin = signal.coin_symbol ? `${signal.coin_symbol} ` : "";
  const title = `${coin}Signal Decoded \u2014 ${signal.sentiment}, ${signal.risk} Risk | SignalDecoder`;
  const description = signal.explanation.slice(0, 160);
  const url = `https://signaldecoder.app/signal/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "SignalDecoder",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function SignalPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const signal = await getSignal(slug);
  if (!signal) notFound();

  const sentiment = sentimentConfig[signal.sentiment];
  const risk = riskConfig[signal.risk];
  const glossary = Array.isArray(signal.glossary) ? signal.glossary : [];
  const date = new Date(signal.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Nav */}
      <nav className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
        >
          Decode your own
        </Link>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
            Signal decoded
          </p>
          {signal.coin_symbol && (
            <Link
              href={`/coins/${signal.coin_symbol.toLowerCase()}`}
              className="inline-block text-xs font-bold tracking-wide text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded px-2 py-0.5 mb-3 hover:bg-cyan-400/20 transition-colors"
            >
              {signal.coin_symbol}
            </Link>
          )}
          <p className="text-xs text-gray-500">{date}</p>
        </header>

        {/* Card */}
        <article className="card p-6 space-y-5">
          {/* Original signal */}
          {signal.signal_text && (
            <blockquote className="text-sm text-gray-300 font-mono leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5">
              {signal.signal_text.length > 300
                ? signal.signal_text.slice(0, 300) + "\u2026"
                : signal.signal_text}
            </blockquote>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sentiment?.bg} ${sentiment?.color}`}>
              <span className="text-sm leading-none">{sentiment?.icon}</span>
              {signal.sentiment}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${risk?.bg} ${risk?.color}`}>
              {signal.risk} Risk
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
              {signal.timeframe}
            </span>
          </div>

          {/* Explanation */}
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Plain English Breakdown
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {signal.explanation}
            </p>
          </div>

          {/* Glossary */}
          {glossary.length > 0 && (
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Key Terms
              </h2>
              <div className="space-y-2">
                {glossary.map((item, i) => (
                  <div key={i} className="flex gap-3">
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
        </article>

        {/* BEGIN AADS AD UNIT 2435147 */}
        <div id="frame" style={{width: "100%", margin: "auto", position: "relative", zIndex: 99998}}>
          <iframe data-aa="2435147" src="//acceptable.a-ads.com/2435147?size=Adaptive" style={{width: "100%", height: "auto", border: "none", overflow: "hidden"}} allow="autoplay"></iframe>
        </div>

        {/* CTA */}
        <div className="mt-6 card p-6 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">
            Decode your own signal
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Paste any crypto tweet, signal, or chart and get a plain English breakdown.
          </p>
          <Link
            href="/app"
            className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-colors"
          >
            Try it free
          </Link>
        </div>
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">
          For educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
