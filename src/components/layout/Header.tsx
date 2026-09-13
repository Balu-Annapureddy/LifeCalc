'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, User, Search, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; emailVerified?: boolean } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check auth status
    const checkAuth = () => {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => {});
    };

    checkAuth();
    window.addEventListener('lifecalc-auth-change', checkAuth);
    return () => {
      window.removeEventListener('lifecalc-auth-change', checkAuth);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setCurrentUser(null);
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
        <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  <span className="text-xs font-medium text-slate-700">
                    {currentUser.name || currentUser.email.split('@')[0]}
                  </span>
                  {currentUser.emailVerified === false && (
                    <span
                      title="Email verification pending"
                      className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded border border-amber-200"
                    >
                      Unverified
                    </span>
                  )}
                </div>
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

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {currentUser ? (
              <>
                <div className="px-3 py-1.5 flex items-center justify-between text-xs font-medium text-slate-700 bg-slate-50 rounded-lg">
                  <span>{currentUser.name || currentUser.email.split('@')[0]}</span>
                  {currentUser.emailVerified === false && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                      Unverified
                    </span>
                  )}
                </div>
                <Link
                  href="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Saved Scenarios
                </Link>
                <Link
                  href="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Calculation History
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-semibold text-white bg-blue-600 rounded-lg"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
