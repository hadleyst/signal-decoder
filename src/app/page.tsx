import Link from "next/link";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-nav)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-nav)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-nav)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-nav" x1="0" y1="0" x2="36" y2="36">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-xl font-bold tracking-tight text-white">
        Signal<span className="text-cyan-400">Decoder</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative z-10 flex flex-col min-h-full">
      {/* Nav */}
      <nav className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/feed" className="text-sm text-gray-400 hover:text-white transition-colors">
            Feed
          </Link>
          <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link href="/app" className="text-sm text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/app"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
          Stop guessing what{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
            crypto signals
          </span>{" "}
          actually mean
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste any crypto trading signal, tweet, or TA post and get a plain English breakdown
          with sentiment analysis, risk assessment, and a jargon glossary.
        </p>
        <div className="flex items-center justify-center">
          <Link
            href="/app"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
          >
            Start Decoding Free
          </Link>
        </div>
      </section>

      {/* Demo */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Input side */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-gray-600" />
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Signal Input
              </h3>
            </div>
            <p className="text-sm text-gray-300 font-mono leading-relaxed">
              BTC breaking out of the descending wedge on the 4H, RSI divergence confirmed.
              Targeting 72k, SL at 64.5k. 3x long. NFA.
            </p>
          </div>

          {/* Output side */}
          <div className="space-y-3">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-cyan-400" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Decoded
                </h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                This trader believes Bitcoin is about to rise after forming a bullish chart
                pattern. They&apos;re opening a leveraged long position with a target of $72,000
                and will cut losses if the price drops to $64,500.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="card-highlight rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Sentiment</p>
                <p className="text-sm font-bold text-emerald-400">Bullish</p>
              </div>
              <div className="card-highlight rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Risk</p>
                <p className="text-sm font-bold text-red-400">High</p>
              </div>
              <div className="card-highlight rounded-xl border border-white/8 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Timeframe</p>
                <p className="text-sm font-medium text-gray-300">Hours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing section removed — free + ads model */}

      {/* Testimonials */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
          What traders are saying
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              quote: "I used to just ape into calls without understanding the TA. Now I actually know what I'm trading and why.",
              name: "Alex K.",
              role: "Retail trader",
            },
            {
              quote: "Finally a tool that translates crypto Twitter into something my non-degen brain can understand.",
              name: "Sarah M.",
              role: "New to crypto",
            },
            {
              quote: "I use this to sanity-check signals before sharing them with my community. The risk assessment is clutch.",
              name: "DeFi Dave",
              role: "Community lead",
            },
          ].map((t) => (
            <div key={t.name} className="card p-5">
              <p className="text-sm text-gray-300 italic leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10" />
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-24 text-center">
        <div className="card p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to decode your first signal?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            No account needed. Paste a signal and get a breakdown in seconds.
          </p>
          <Link
            href="/app"
            className="inline-block rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
          >
            Try SignalDecoder free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-gray-600">
            For educational purposes only. Not financial advice.
          </p>
          <nav className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/feed" className="hover:text-cyan-400 transition-colors">
              Feed
            </Link>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <Link href="/glossary" className="hover:text-cyan-400 transition-colors">
              Glossary
            </Link>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <Link href="/app" className="hover:text-cyan-400 transition-colors">
              Decoder
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
