import React from 'react';
import { Calculator, ShieldCheck, Zap, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <div className="space-y-2 border-b border-slate-200/60 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          About LifeCalc
        </h1>
        <p className="text-sm text-slate-500">
          Our core product philosophy, mathematical standards, and mission.
        </p>
      </div>

      <div className="prose prose-slate text-sm text-slate-600 leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Why LifeCalc Exists: "Your numbers. Your decisions."
          </h2>
          <p>
            LifeCalc was founded on a simple observation: modern decisions involving money, salaries, loans, college grades, and big purchases are too important to be answered by cluttered 2008-era calculator sites or hallucination-prone AI chatbots.
          </p>
          <p>
            We created LifeCalc as a high-performance, universal utility platform built around a clean, transparent loop:
          </p>
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-1.5 shadow-inner">
            <div>User has a question</div>
            <div className="text-blue-400">    ↓</div>
            <div>User enters a few numbers</div>
            <div className="text-blue-400">    ↓</div>
            <div>LifeCalc calculates authoritative answer</div>
            <div className="text-blue-400">    ↓</div>
            <div>LifeCalc explains the real-world result</div>
            <div className="text-blue-400">    ↓</div>
            <div>LifeCalc offers actionable decision support</div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Authoritative Mathematics First, AI Second
          </h2>
          <p>
            At LifeCalc, deterministic calculations are non-negotiable. Where an authoritative mathematical formula exists—whether reducing-balance EMI compounding, Indian New Tax Regime slabs, or CBSE CGPA conversion multipliers—the math is executed by pure, independently tested algorithms.
          </p>
          <p>
            Artificial intelligence is reserved exclusively for personalising explanations and contextualising your numbers—never for inventing unverified formulas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Transparent India-First Focus
          </h2>
          <p>
            We prioritise Indian financial realities: statutory Provident Fund (EPF), Professional Tax, New and Old Income Tax Regimes, Goods and Services Tax (GST), and 75% college attendance rules. Every calculator documents its assumptions and formula openly.
          </p>
        </section>
      </div>
    </div>
  );
}
