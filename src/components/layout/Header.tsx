'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calculator, User, Search, Menu, X, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  remainingCalculations?: number;
}

export const Header: React.FC<HeaderProps> = ({ remainingCalculations: initialRemaining = 15 }) => {
  const [remaining, setRemaining] = useState<number>(initialRemaining);
  const [isGuest, setIsGuest] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setIsGuest(false);
        } else {
          // If not authed, fetch guest quota
          fetch('/api/calculate')
            .then(res => res.json())
            .then(calcData => {
              if (calcData.isGuest !== undefined) {
                setIsGuest(calcData.isGuest);
                setRemaining(calcData.calculationsRemaining);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setCurrentUser(null);
      setIsGuest(true);
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

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
              Money
            </Link>
            <Link href="/calculators/student" className="hover:text-blue-600 transition-colors">
              Student
            </Link>
            <Link href="/calculators/buying" className="hover:text-blue-600 transition-colors">
              Decisions
            </Link>
            <Link href="/calculators/everyday" className="hover:text-blue-600 transition-colors">
              Everyday
            </Link>
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-3">
          {/* Guest Calculation Counter */}
          {isGuest && remaining !== Infinity && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                remaining <= 3
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Guest calculations remaining before free signup"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Free calculations: <strong className="font-bold">{remaining}</strong> / 15
              </span>
            </div>
          )}

          {/* Search Button */}
          <Link
            href="/search"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Search calculators"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* Auth CTA or User Menu */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/saved"
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Saved
                </Link>
                <Link
                  href="/history"
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  History
                </Link>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Sign in
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Create free account
              </Link>
            </>
          )}

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

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          {isGuest && (
            <div className="text-xs font-medium text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
              <span>Free guest calculations left:</span>
              <strong className="text-blue-600">{remaining} / 15</strong>
            </div>
          )}
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link
              href="/calculators/money"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Money & Loans
            </Link>
            <Link
              href="/calculators/student"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Student & Academics
            </Link>
            <Link
              href="/calculators/buying"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Buying & Affordability
            </Link>
            <Link
              href="/calculators/everyday"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Everyday Tools
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
