import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { registry } from '@/engine/registry';
import { CATEGORIES } from '@/engine/categories';
import { CalculatorRunner } from '@/components/calculator/CalculatorRunner';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { CalculatorCategory } from '@/engine/types';

interface PageProps {
  params: {
    category: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const calculators = registry.getAll();
  return calculators.map(c => ({
    category: c.category,
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const calc = registry.getBySlug(params.slug);
  if (!calc) return { title: 'Calculator Not Found — LifeCalc' };

  return {
    title: `${calc.seo.title} | LifeCalc`,
    description: calc.seo.description,
    keywords: calc.seo.keywords,
    alternates: {
      canonical: calc.seo.canonicalPath,
    },
    openGraph: {
      title: `${calc.name} — Free Online Calculator | LifeCalc`,
      description: calc.description,
      type: 'website',
      url: `https://lifecalc.in${calc.seo.canonicalPath}`,
    },
  };
}

export default function CalculatorPage({ params }: PageProps) {
  const calc = registry.getBySlug(params.slug);
  if (!calc || calc.category !== params.category) {
    notFound();
  }

  const categoryMeta = CATEGORIES[calc.category as CalculatorCategory];
  const relatedCalculators = registry.getRelated(calc.id);

  // JSON-LD Structured Data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: calc.name,
    description: calc.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
  };

  return (
    <div className="space-y-6">
      {/* Schema.org Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href={`/calculators/${calc.category}`}
          className="hover:text-blue-600 transition-colors capitalize"
        >
          {categoryMeta?.name || calc.category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-medium">{calc.name}</span>
      </nav>

      {/* Page Heading & Short Description */}
      <div className="space-y-2 border-b border-slate-200/60 pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {calc.name}
          </h1>
          {calc.badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              {calc.badge}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            100% Free & Authoritative
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {calc.description}
        </p>
      </div>

      {/* Interactive Calculator Runner */}
      <CalculatorRunner
        calculatorId={calc.id}
      />
    </div>
  );
}
