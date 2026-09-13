'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/engine/formatters';

interface ExpenseEntry {
  id: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  note: string;
}

const DEFAULT_ENTRIES: ExpenseEntry[] = [
  { id: '1', category: 'Salary', amount: 85000, type: 'income', date: '2026-09-01', note: 'Monthly take-home credit' },
  { id: '2', category: 'Rent', amount: 24000, type: 'expense', date: '2026-09-02', note: '2BHK Apartment Rent' },
  { id: '3', category: 'Food & Groceries', amount: 12500, type: 'expense', date: '2026-09-05', note: 'Supermarket & dining' },
  { id: '4', category: 'Transport & Fuel', amount: 4500, type: 'expense', date: '2026-09-07', note: 'Petrol & metro pass' },
  { id: '5', category: 'Shopping', amount: 8000, type: 'expense', date: '2026-09-09', note: 'Electronics & clothing' },
  { id: '6', category: 'Utilities & WiFi', amount: 3200, type: 'expense', date: '2026-09-10', note: 'Electricity, water, broadband' },
  { id: '7', category: 'Subscriptions', amount: 1400, type: 'expense', date: '2026-09-11', note: 'Streaming & gym' },
];

export default function FinancePage() {
  const [entries, setEntries] = useState<ExpenseEntry[]>(DEFAULT_ENTRIES);
  const [newCategory, setNewCategory] = useState('Food & Groceries');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');

  // Deterministic financial metrics
  const { totalIncome, totalExpenses, netSavings, savingsRate, categoryTotals } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap: Record<string, number> = {};

    entries.forEach(e => {
      if (e.type === 'income') {
        inc += e.amount;
      } else {
        exp += e.amount;
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      }
    });

    const savings = inc - exp;
    const rate = inc > 0 ? (savings / inc) * 100 : 0;

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    return {
      totalIncome: inc,
      totalExpenses: exp,
      netSavings: savings,
      savingsRate: rate,
      categoryTotals: sortedCats,
    };
  }, [entries]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) return;

    const entry: ExpenseEntry = {
      id: Date.now().toString(),
      category: newCategory,
      amount: amt,
      type: newType,
      date: new Date().toISOString().split('T')[0],
      note: newNote || newCategory,
    };

    setEntries(prev => [entry, ...prev]);
    setNewAmount('');
    setNewNote('');
  };

  // Deterministic Insights Generation (Requirement 30)
  const largestDiscretionary = categoryTotals.find(c => c[0] !== 'Rent' && c[0] !== 'Utilities & WiFi');

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              Personal Finance & Budget Summary
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Pro Feature
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track income, analyze discretionary expenditure, and optimize your monthly savings rate.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Private & Client-Encrypted</span>
        </div>
      </div>

      {/* Financial Health KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Monthly Income</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-[11px] text-slate-400">Recorded take-home credits</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Outflow</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-400">Fixed & variable living expenses</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Monthly Net Savings</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className={`text-2xl font-extrabold font-mono ${netSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(netSavings)}
          </div>
          <p className="text-[11px] text-slate-400">Free cash flow available for SIPs</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Savings Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-mono">
            {formatPercentage(savingsRate, 1)}
          </div>
          <p className="text-[11px] text-slate-400">Target benchmark is &gt; 20%</p>
        </div>
      </div>

      {/* Deterministic Optimization Insight Banner (Requirement 30) */}
      {largestDiscretionary && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/60 p-5 sm:p-6 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>Financial Optimization Insight</span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                Personalized
              </span>
            </div>
            <p>
              Your largest discretionary expenditure this month is <strong>{largestDiscretionary[0]}</strong> ({formatCurrency(largestDiscretionary[1])}). Reducing this category by just <strong>₹2,000/month</strong> would compound to approximately <strong>₹24,000/year</strong> in surplus savings.
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              If invested into a 12% SIP, that ₹2,000 monthly reduction could grow into <strong>₹20 Lakhs</strong> over 20 years.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Add Transaction Form + Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Quick Add Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Record Transaction
          </h2>

          <form onSubmit={handleAddEntry} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType('expense')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  newType === 'expense'
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setNewType('income')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  newType === 'income'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Income
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="Food & Groceries">Food & Groceries</option>
                <option value="Rent">Rent</option>
                <option value="Transport & Fuel">Transport & Fuel</option>
                <option value="Shopping">Shopping</option>
                <option value="Utilities & WiFi">Utilities & WiFi</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Education">Education</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Salary">Salary / Primary Income</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 2500"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Note / Description</label>
              <input
                type="text"
                placeholder="e.g. Dinner with friends"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors mt-2"
            >
              Add Transaction
            </button>
          </form>
        </div>

        {/* Category Breakdown & Ledger */}
        <div className="lg:col-span-7 space-y-6">
          {/* Category Breakdown Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Category Breakdown
            </h3>

            <div className="space-y-3">
              {categoryTotals.map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {formatCurrency(amt)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Entries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            <div className="divide-y divide-slate-100">
              {entries.slice(0, 5).map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{item.note}</div>
                    <div className="text-[11px] text-slate-400">{item.category} • {item.date}</div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      item.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
