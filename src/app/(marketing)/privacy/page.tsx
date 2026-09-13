import React from 'react';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="space-y-2 border-b border-slate-200/60 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">
          Last updated: September 2026 â€¢ LifeCalc Platform
        </p>
      </div>

      <div className="prose prose-slate text-sm text-slate-600 leading-relaxed space-y-6">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <strong className="font-semibold block text-sm">Our Core Privacy Commitment:</strong>
            We do not sell your personal or financial calculation data. Basic calculators run purely deterministic formulas, and your inputs are your private property.
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            <strong>Guest Users:</strong> When using LifeCalc without an account, calculation values remain client-side in your browser. An anonymous, temporary session identifier is tracked solely to prevent automated bot abuse and ensure system stability.
          </p>
          <p>
            <strong>Registered Users:</strong> If you choose to create a free account, we store your email address, profile preferences, and any calculations you explicitly choose to save into your personal dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Financial Data Handling</h2>
          <p>
            LifeCalc calculates salary estimates, loans, investments, and purchase affordability. We strictly separate analytics telemetry from raw financial inputs:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>We do NOT transmit raw salary or net worth figures to external marketing pixels.</li>
            <li>We do NOT store payment card credentials on our servers.</li>
            <li>You can delete your saved calculations or account at any time.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Advertising & Cookies</h2>
          <p>
            LifeCalc displays non-intrusive advertisements (such as Google AdSense side rails on desktop). Premium subscribers receive an ad-free experience. Third-party advertising networks may use cookies to serve ads based on prior web visits in accordance with standard industry practices.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Contact & Data Deletion</h2>
          <p>
            To request full deletion of your user account and saved calculation records, email us at <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded">privacy@lifecalc.in</code>.
          </p>
        </section>
      </div>
    </div>
  );
}

