'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, X, BookmarkCheck, History, Share2, Shield } from 'lucide-react';

interface GuestAccountNudgeProps {
  onDismiss: () => void;
  usageCount: number;
}

export const GuestAccountNudge: React.FC<GuestAccountNudgeProps> = ({ onDismiss, usageCount }) => {
  return (
    <div
      data-testid="guest-account-nudge"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-full bg-white rounded-2xl border border-blue-200/90 shadow-2xl shadow-blue-900/15 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            LifeCalc Free Account
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Get more from LifeCalc
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Create a free account to save your calculations and keep your history available whenever you need it.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2 pb-1 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Save calculations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Calculation history</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Saved scenarios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Sync across devices</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row items-center gap-2">
        <Link
          href="/signup"
          className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm text-center transition-colors"
        >
          Create free account
        </Link>
        <Link
          href="/signin"
          className="w-full sm:w-auto py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl text-center transition-colors"
        >
          Sign in
        </Link>
        <button
          onClick={onDismiss}
          className="w-full sm:w-auto py-2.5 px-3 text-slate-500 hover:text-slate-700 text-xs font-medium text-center transition-colors"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
};
