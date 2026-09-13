'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Calculator, ArrowRight, Trash2, Bookmark, ExternalLink } from 'lucide-react';
import { registry } from '@/engine/registry';

interface HistoryEntry {
  id: string;
  calculatorId: string;
  summary: string;
  primaryValue: string;
  timestamp: string;
  inputs: Record<string, any>;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setHistory(data.items);
        } else {
          // fallback to localStorage
          const local = localStorage.getItem('lifecalc_history');
          if (local) {
            try { setHistory(JSON.parse(local)); } catch {}
          }
        }
      })
      .catch(() => {
        const local = localStorage.getItem('lifecalc_history');
        if (local) {
          try { setHistory(JSON.parse(local)); } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try { localStorage.setItem('lifecalc_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  const handleClearAll = async () => {
    setHistory([]);
    try { localStorage.removeItem('lifecalc_history'); } catch {}
    try {
      await fetch('/api/history', { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Calculation History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and reopen your recent calculation scenarios.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            Clear all history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">No calculations recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            As you calculate loan EMIs, investments, or salary in-hand, your calculation history will appear here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            Explore Calculators
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(item => {
            const calc = registry.getById(item.calculatorId);
            const params = new URLSearchParams();
            Object.entries(item.inputs).forEach(([k, v]) => params.set(k, String(v)));
            const reopenUrl = calc
              ? `/calculators/${calc.category}/${calc.slug}?${params.toString()}`
              : '#';

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {calc?.name || item.calculatorId}
                    </span>
                    <span className="text-[11px] text-slate-400">• {item.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono">{item.summary}</p>
                  <div className="text-sm font-extrabold text-blue-600 font-mono">
                    {item.primaryValue}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={reopenUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <span>Reopen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
