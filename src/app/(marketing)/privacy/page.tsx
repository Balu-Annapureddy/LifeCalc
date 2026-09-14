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
          Last updated: September 2026 • LifeCalc Platform
        </p>
      </div>

      <div className="prose prose-slate text-sm text-slate-600 leading-relaxed space-y-6">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <strong className="font-semibold block text-sm">Our Core Privacy Commitment:</strong>
            LifeCalc is an anonymous, browser-first calculator platform. We do not require accounts, sign-ins, or email addresses. Your financial inputs and calculations never leave your device.
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Zero Account Architecture</h2>
          <p>
            LifeCalc does not have user accounts, passwords, or cloud database storage. All calculations run strictly client-side within your browser using deterministic mathematics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Browser-Local Storage</h2>
          <p>
            When you save a calculation scenario or review your calculation history, that data is stored solely in your web browser's local storage (<code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded text-xs">localStorage</code>). It is never transmitted to any LifeCalc server or third-party cloud. You can clear this data at any time directly through the app or by clearing your browser cache.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Share Links</h2>
          <p>
            When you choose to share a calculation via the "Share" button, the input values are encoded directly into the URL query string. Anyone with whom you share the link will open the calculator with those initial values loaded client-side in their browser.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Contact</h2>
          <p>
            For privacy inquiries or technical questions, contact us at{' '}
            <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded">privacy@lifecalc.in</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
