'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calculator, Search, Menu, X, Bookmark, Clock, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 leading-tight tracking-tight">
                LifeCalc
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-normal hidden sm:block">
                Your numbers. Your decisions.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/calculators/money" className="hover:text-blue-600 transition-colors">
              Money & Expenses
            </Link>
            <Link href="/calculators/student" className="hover:text-blue-600 transition-colors">
              Student
            </Link>
            <Link href="/calculators/buying" className="hover:text-blue-600 transition-colors">
              Buying
            </Link>
            <Link href="/calculators/time/age" className="hover:text-blue-600 transition-colors">
              Age & Life
            </Link>
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Button */}
          <Link
            href="/search"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Search calculators"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* Saved & History Direct Links */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Link
              href="/saved"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-600" />
              <span>Saved</span>
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>History</span>
            </Link>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Free & Private</span>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-500 md:hidden rounded-lg hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="space-y-1 text-sm font-medium text-slate-700">
            <Link
              href="/calculators/money"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Money & Everyday Expenses
            </Link>
            <Link
              href="/calculators/student"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Student & Academics
            </Link>
            <Link
              href="/calculators/buying"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Buying & Affordability
            </Link>
            <Link
              href="/calculators/time/age"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Age & Life
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1">
            <Link
              href="/saved"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Bookmark className="w-4 h-4 text-blue-600" />
              <span>Saved Scenarios</span>
            </Link>
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Calculation History</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
