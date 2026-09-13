'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, ExternalLink, Trash2, Edit3, Plus, ShieldCheck } from 'lucide-react';
import { registry } from '@/engine/registry';

interface SavedScenario {
  id: string;
  name: string;
  calculatorId: string;
  primaryResult: string;
  notes?: string;
  updatedAt: string;
  inputs: Record<string, any>;
}

const DEFAULT_SAVED: SavedScenario[] = [
  {
    id: 'save_1',
    name: 'My SBI Home Loan Option',
    calculatorId: 'emi',
    primaryResult: '₹43,391 / mo',
    notes: '₹50 Lakhs @ 8.5% for 20 years with SBI Maxgain',
    updatedAt: 'Sep 12, 2026',
    inputs: { principal: 5000000, annualRate: 8.5, tenureYears: 20 },
  },
  {
    id: 'save_2',
    name: 'Retirement Wealth Goal',
    calculatorId: 'sip',
    primaryResult: '₹49,95,740',
    notes: '₹5,000/mo into Nifty 50 Index Fund for 20 years',
    updatedAt: 'Sep 08, 2026',
    inputs: { monthlyInvestment: 5000, expectedReturnRate: 12, investmentPeriodYears: 20 },
  },
  {
    id: 'save_3',
    name: 'MacBook Pro Purchase Test',
    calculatorId: 'can-i-afford-this',
    primaryResult: 'Safe & Affordable',
    notes: 'Checked cash flow and emergency fund impact',
    updatedAt: 'Sep 05, 2026',
    inputs: { monthlyIncome: 85000, monthlyExpenses: 35000, itemPrice: 160000, paymentMode: 'emi' },
  },
];

export default function SavedPage() {
  const [savedList, setSavedList] = useState<SavedScenario[]>(DEFAULT_SAVED);

  const handleDelete = (id: string) => {
    setSavedList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-blue-600" />
            Saved Calculations & Scenarios
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your bookmarked financial models and decision plans.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Synced across devices</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {savedList.map(item => {
          const calc = registry.getById(item.calculatorId);
          const params = new URLSearchParams();
          Object.entries(item.inputs).forEach(([k, v]) => params.set(k, String(v)));
          const openUrl = calc
            ? `/calculators/${calc.category}/${calc.slug}?${params.toString()}`
            : '#';

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                    {calc?.name || item.calculatorId}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove saved calculation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  {item.name}
                </h3>

                <div className="text-lg font-extrabold text-slate-900 font-mono">
                  {item.primaryResult}
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2">{item.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Saved {item.updatedAt}</span>
                <Link
                  href={openUrl}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                >
                  <span>Reopen Scenario</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
