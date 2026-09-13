'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { registry } from '@/engine/registry';
import { Search, ArrowRight, Sparkles, Calculator } from 'lucide-react';
import { parseNaturalLanguageQuery } from '@/engine/search/nl-parser';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    return registry.search(query);
  }, [query]);

  const nlMatch = useMemo(() => {
    return parseNaturalLanguageQuery(query);
  }, [query]);

  const handleOpenNlMatch = () => {
    if (!nlMatch) return;
    const params = new URLSearchParams();
    Object.entries(nlMatch.extractedInputs).forEach(([k, v]) => params.set(k, String(v)));
    const calc = registry.getById(nlMatch.calculatorId);
    if (calc) {
      router.push(`/calculators/${calc.category}/${calc.slug}?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Search LifeCalc
        </h1>
        <p className="text-sm text-slate-500">
          Search across 100+ formulas, everyday tools, and personal decision engines.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by topic, keyword, or query (e.g. loan, tax, attendance, ctc, car)..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
          autoFocus
        />
      </div>

      {/* NL Match Banner */}
      {nlMatch && (
        <div
          onClick={handleOpenNlMatch}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Direct Calculator Match: {nlMatch.matchedIntent}
              </div>
              <div className="text-xs text-blue-700">
                Click to open pre-filled with your parameters
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600" />
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {results.length} Calculator{results.length === 1 ? '' : 's'} Available
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {results.map(calc => (
            <Link
              key={calc.id}
              href={`/calculators/${calc.category}/${calc.slug}`}
              className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                    {calc.subcategory || calc.category}
                  </span>
                  {calc.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700">
                      {calc.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {calc.name}
                </h2>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {calc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Calculate now</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
