import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { registry } from '@/engine/registry';
import { CATEGORIES } from '@/engine/categories';
import { CalculatorCategory } from '@/engine/types';
import { ChevronRight, ArrowRight, Calculator } from 'lucide-react';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map(category => ({ category }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const cat = CATEGORIES[params.category as CalculatorCategory];
  if (!cat) return { title: 'Category Not Found — LifeCalc' };

  return {
    title: `${cat.name} Calculators & Decision Tools | LifeCalc`,
    description: `Free, authoritative ${cat.name} calculators. ${cat.description}`,
    keywords: [`${cat.name} calculator`, 'free online calculators', 'lifecalc tools'],
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const cat = CATEGORIES[params.category as CalculatorCategory];
  if (!cat) {
    notFound();
  }

  const calculators = registry.getByCategory(cat.id);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-medium">{cat.name}</span>
      </nav>

      {/* Header */}
      <div className="space-y-2 border-b border-slate-200/60 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {cat.name} Calculators
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {cat.description}
        </p>
      </div>

      {/* Calculator Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {calculators.map(calc => (
          <Link
            key={calc.id}
            href={`/calculators/${calc.category}/${calc.slug}`}
            className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                  {calc.subcategory || cat.name}
                </span>
                {calc.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700">
                    {calc.badge}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {calc.name}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                {calc.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>Open calculator</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
