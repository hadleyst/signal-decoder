"use client";

import { useState, useMemo } from "react";
import type { GlossaryTerm, GlossaryCategory } from "@/lib/glossaryTerms";
import { GLOSSARY_CATEGORIES } from "@/lib/glossaryTerms";

interface Props {
  terms: GlossaryTerm[];
}

const categoryColors: Record<GlossaryCategory, string> = {
  "Chart Patterns": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Indicators": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Order Types": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "General Crypto": "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function GlossarySearch({ terms }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter((t) => {
      if (activeCategory !== "All" && t.category !== activeCategory) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
      );
    });
  }, [terms, query, activeCategory]);

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms... (e.g. RSI, liquidation, wedge)"
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.07] transition-colors"
          aria-label="Search glossary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory("All")}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            activeCategory === "All"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
        >
          All ({terms.length})
        </button>
        {GLOSSARY_CATEGORIES.map((cat) => {
          const count = terms.filter((t) => t.category === cat).length;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? `${categoryColors[cat]}`
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-400">
            No terms match &ldquo;{query}&rdquo;.
            <button
              onClick={() => { setQuery(""); setActiveCategory("All"); }}
              className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Clear filters
            </button>
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-600 mb-3">
            Showing {filtered.length} of {terms.length} terms
          </p>
          <div className="space-y-3">
            {filtered.map((t) => (
              <article
                key={t.slug}
                id={t.slug}
                className="card p-5 scroll-mt-20"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="text-lg font-semibold text-white">
                    <a href={`#${t.slug}`} className="hover:text-cyan-400 transition-colors">
                      {t.term}
                    </a>
                  </h2>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${categoryColors[t.category]}`}>
                    {t.category}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {t.definition}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
