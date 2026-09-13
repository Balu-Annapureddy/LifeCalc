import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { registry } from '@/engine/registry';
import { getSharedCalculation } from '@/lib/share';
import { CalculatorRunner } from '@/components/calculator/CalculatorRunner';
import { Share2, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface SharePageProps {
  params: {
    id: string;
  };
  searchParams?: Record<string, string>;
}

export default function SharePage({ params, searchParams }: SharePageProps) {
  const shared = getSharedCalculation(params.id);
  const calculatorId = shared?.calculatorId || searchParams?.calc || 'emi';
  const calc = registry.getById(calculatorId) || registry.getAll()[0];

  const initialInputs = shared ? shared.inputs : searchParams;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/calculators/${calc.category}/${calc.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {calc.name}</span>
        </Link>
      </div>

      {/* Shared Calculation Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Shared Calculation: {calc.name}
            </h2>
            <p className="text-xs text-slate-600">
              {shared
                ? 'This scenario was saved and shared with you. You can inspect the verified results or adjust values below.'
                : 'Shared parameter preset loaded. You can tweak values and simulate custom scenarios.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Engine Result</span>
        </div>
      </div>

      {/* Calculator Runner */}
      <CalculatorRunner
        calculatorId={calc.id}
        initialInputs={initialInputs}
      />
    </div>
  );
}
