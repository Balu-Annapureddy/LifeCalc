'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  IndianRupee,
  GraduationCap,
  ShoppingBag,
  Clock,
  Cpu,
  Calculator,
} from 'lucide-react';
import { CATEGORY_LIST } from '@/engine/categories';
import { registry } from '@/engine/registry';
import { parseNaturalLanguageQuery } from '@/engine/search/nl-parser';

const iconMap: Record<string, React.ReactNode> = {
  IndianRupee: <IndianRupee className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  Cpu: <Cpu className="w-5 h-5" />,
  Calculator: <Calculator className="w-5 h-5" />,
};

const SUGGESTED_QUERIES = [
  { label: '10 lakh loan at 9% for 5 years', query: '10 lakh loan at 9% for 5 years' },
  { label: '₹5,000/mo SIP for 15 years', query: 'sip 5000 12% 15 years' },
  { label: 'Can I afford a ₹1.2 lakh laptop?', query: 'can i afford 1.2 lakh laptop' },
  { label: '8.4 CGPA to percentage', query: '8.4 cgpa to percentage' },
  { label: '38/50 classes attended', query: 'attendance 38 out of 50' },
  { label: '250 km trip petrol cost', query: 'fuel 250 km mileage 15' },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length > 3) {
      const parsed = parseNaturalLanguageQuery(q);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const parsed = parseNaturalLanguageQuery(searchQuery);
    if (parsed) {
      const params = new URLSearchParams();
      Object.entries(parsed.extractedInputs).forEach(([k, v]) => params.set(k, String(v)));
      const calc = registry.getById(parsed.calculatorId);
      if (calc) {
        router.push(`/calculators/${calc.category}/${calc.slug}?${params.toString()}`);
        return;
      }
    }

    // Fallback to text search page
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const executeQuickQuery = (q: string) => {
    setSearchQuery(q);
    const parsed = parseNaturalLanguageQuery(q);
    if (parsed) {
      const params = new URLSearchParams();
      Object.entries(parsed.extractedInputs).forEach(([k, v]) => params.set(k, String(v)));
      const calc = registry.getById(parsed.calculatorId);
      if (calc) {
        router.push(`/calculators/${calc.category}/${calc.slug}?${params.toString()}`);
      }
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center space-y-5 max-w-3xl mx-auto px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Universal Calculator & Personal Decision Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
          Your numbers. <br className="hidden sm:inline" />
          <span className="text-blue-600">Your decisions.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          From salary in-hand and loan EMIs to college attendance and purchase affordability — calculate authoritative numbers with transparent explanations.
        </p>

        {/* Natural Language Search Box (Requirements 22, 54) */}
        <div className="pt-2 max-w-2xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="What do you want to calculate? e.g. 10 lakh loan at 9% for 5 years"
                className="w-full pl-12 pr-28 py-3.5 sm:py-4 text-sm sm:text-base rounded-2xl border-2 border-slate-200 bg-white text-slate-900 shadow-sm focus:border-blue-600 focus:ring-0 focus:outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
              >
                Calculate
              </button>
            </div>

            {/* Instant Intent Recognition Dropdown */}
            {parsedPreview && (
              <div
                onClick={() => executeQuickQuery(searchQuery)}
                className="absolute left-0 right-0 top-full mt-2 bg-white border border-blue-200 rounded-xl p-3 shadow-lg text-left z-20 cursor-pointer hover:bg-blue-50/50 transition-colors flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                    Instant Match: {parsedPreview.matchedIntent}
                  </div>
                  <div className="text-xs text-slate-700">
                    Open {registry.getById(parsedPreview.calculatorId)?.name} with your values
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
            )}
          </form>

          {/* Quick-Click Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
            <span className="font-medium">Try:</span>
            {SUGGESTED_QUERIES.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => executeQuickQuery(sq.query)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-[11px]"
              >
                {sq.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Categories Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Explore by Category</h2>
            <p className="text-xs text-slate-500">Find the right tool for your specific question</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORY_LIST.map(cat => (
            <Link
              key={cat.id}
              href={`/calculators/${cat.id}`}
              className="group bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col items-center text-center space-y-2"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: cat.color }}
              >
                {iconMap[cat.iconName]}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Decision Support Tools (Requirements 2, 19, 54) */}
      <section className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/10">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Featured Decision Engine</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Can I Afford This?
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Planning a laptop upgrade, new phone, or car purchase? LifeCalc evaluates your monthly income, living expenses, existing debt commitments, and emergency fund buffer to give you an objective financial assessment before you buy.
          </p>

          <div className="pt-2">
            <Link
              href="/calculators/buying/can-i-afford-this"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-blue-50 rounded-xl shadow transition-colors"
            >
              <span>Test Affordability Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Popular Calculators Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Popular Daily Calculators</h2>
            <p className="text-xs text-slate-500">Most calculated across students, professionals, and families</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {registry.getAll().slice(0, 6).map(calc => (
            <Link
              key={calc.id}
              href={`/calculators/${calc.category}/${calc.slug}`}
              className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
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
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {calc.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {calc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Start calculation</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust & Methodology Pillars (Requirements 2, 96) */}
      <section className="border-t border-slate-200/60 pt-10">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Why Trust LifeCalc?</h2>
          <p className="text-xs text-slate-500">
            Built on verifiable mathematics, zero misleading dark patterns, and transparent explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Deterministic Pure Math</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every formula is mathematically pure and independently tested against authoritative banking, academic, and tax standards. No AI hallucinations for numbers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Free & Transparent</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              All basic calculators remain 100% free forever without hidden paywalls. Full formulas, variable breakdowns, and assumptions are always visible.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Decision Support</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Beyond raw numbers, LifeCalc explains what values mean for your real-world wallet, college eligibility, and family financial health.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
