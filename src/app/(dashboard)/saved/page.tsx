'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, ExternalLink, Trash2, ShieldCheck } from 'lucide-react';
import { registry } from '@/engine/registry';
import {
  SavedScenario,
  getSavedScenarios,
  deleteSavedScenario,
} from '@/lib/storage';

export default function SavedPage() {
  const [savedList, setSavedList] = useState<SavedScenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSavedList(getSavedScenarios());
    setLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    deleteSavedScenario(id);
    setSavedList(getSavedScenarios());
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
            Access your bookmarked financial models and decision plans. Stored privately in your browser.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Private & Browser-Local</span>
        </div>
      </div>

      {savedList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">No saved calculations yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When exploring loan schedules, SIPs, or affordability models, save your scenarios to track and compare them here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            Explore Calculators
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {savedList.map(item => {
            const calc = registry.getById(item.calculatorId);
            const params = new URLSearchParams();
            Object.entries(item.inputs).forEach(([k, v]) => {
              if (v !== undefined && v !== null) {
                params.set(k, String(v));
              }
            });
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
      )}
    </div>
  );
}
