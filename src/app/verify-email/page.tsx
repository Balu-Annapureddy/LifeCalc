'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing email verification token. Please check your verification link.');
      return;
    }

    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Your email address has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Invalid or expired verification link.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error verifying your email. Please try again.');
      });
  }, [token]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center space-y-6">
      {status === 'loading' && (
        <div className="space-y-4 py-6">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Verifying Your Email</h1>
          <p className="text-xs text-slate-500">Checking your verification token with LifeCalc...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Email Verified!</h1>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <span>Return to LifeCalc</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Verification Failed</h1>
          <p className="text-xs text-rose-600 leading-relaxed">{message}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/signin"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <React.Suspense
        fallback={
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center space-y-4 py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading verification service...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </React.Suspense>
    </div>
  );
}
