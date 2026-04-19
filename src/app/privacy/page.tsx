import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | SignalDecoder",
  description: "SignalDecoder privacy policy. We don't collect personal data, track you, or sell your information.",
  alternates: { canonical: "https://signaldecoder.app/privacy" },
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="url(#logo-gradient-priv)" fillOpacity="0.15" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="url(#logo-gradient-priv)" strokeOpacity="0.3" />
        <path d="M8 22L13 16L17 19L23 12L28 17" stroke="url(#logo-gradient-priv)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="17" r="2" fill="#22d3ee" />
        <defs>
          <linearGradient id="logo-gradient-priv" x1="0" y1="0" x2="36" y2="36">
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

export default function PrivacyPage() {
  return (
    <div className="relative z-10 flex flex-col min-h-full">
      <nav className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <Link href="/app" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors">
          Decode Signal
        </Link>
      </nav>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: April 2026</p>
        </header>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
            <p>
              SignalDecoder is designed with privacy in mind. We don&apos;t collect personal data, we don&apos;t
              track you across the web, and we never sell your information to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">What we don&apos;t do</h2>
            <ul className="list-disc list-inside space-y-1.5 text-gray-400">
              <li>We don&apos;t collect or store personal information</li>
              <li>We don&apos;t use cookies for tracking or advertising</li>
              <li>We don&apos;t sell, share, or rent your data to third parties</li>
              <li>We don&apos;t use analytics trackers or fingerprinting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Signal decoding</h2>
            <p>
              When you submit text to decode, it is sent to our server and processed by an AI model to
              generate the plain English breakdown. The submitted text is used solely to produce the
              decode result. Decoded signals may be saved as public pages with a unique link — no
              identifying information is attached to these pages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Chrome extension</h2>
            <p>
              The SignalDecoder Chrome extension only activates when you explicitly right-click and
              choose &ldquo;Decode this signal.&rdquo; Selected text is sent to our API for decoding and is not
              stored, logged, or associated with your identity. The extension does not read or access
              any other page content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Telegram and Discord bots</h2>
            <p>
              Messages sent to our bots are processed to generate decode results and are not stored
              beyond the public signal page created for each decode. We do not store usernames,
              chat IDs, or message history.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Accounts</h2>
            <p>
              If you create an account, we store your email address for authentication purposes only.
              You can delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Advertising</h2>
            <p>
              We display ads from third-party ad networks. These networks may use their own cookies.
              We do not share any user data with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Contact</h2>
            <p>
              Questions about this policy? Reach out at{" "}
              <span className="text-cyan-400">privacy@signaldecoder.app</span>.
            </p>
          </section>
        </div>
      </main>

      <footer className="w-full text-center py-6 px-4 border-t border-white/5">
        <p className="text-xs text-gray-600">For educational purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}
