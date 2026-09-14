import React from 'react';
import Link from 'next/link';
import { Calculator, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">LifeCalc</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your numbers. Your decisions. Universal calculator and personal decision-support platform.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Free & Anonymous — No Login Required</span>
            </div>
          </div>

          {/* Money Calculators */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Money & Loans
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/calculators/money/emi" className="hover:text-blue-600">
                  EMI Calculator
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/sip" className="hover:text-blue-600">
                  SIP Investment Calculator
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/ctc-to-take-home" className="hover:text-blue-600">
                  CTC to In-Hand Salary
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/compound-interest" className="hover:text-blue-600">
                  Compound Interest
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/cagr" className="hover:text-blue-600">
                  CAGR Return Calculator
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/gst" className="hover:text-blue-600">
                  GST Calculator India
                </Link>
              </li>
            </ul>
          </div>

          {/* Student & Decisions */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Students & Decisions
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/calculators/student/attendance" className="hover:text-blue-600">
                  College Attendance (75% Target)
                </Link>
              </li>
              <li>
                <Link href="/calculators/student/cgpa" className="hover:text-blue-600">
                  CGPA to Percentage
                </Link>
              </li>
              <li>
                <Link href="/calculators/buying/can-i-afford-this" className="hover:text-blue-600">
                  Can I Afford This?
                </Link>
              </li>
              <li>
                <Link href="/calculators/time/age" className="hover:text-blue-600">
                  Exact Age Calculator
                </Link>
              </li>
              <li>
                <Link href="/calculators/money/fuel-cost" className="hover:text-blue-600">
                  Fuel Cost & Mileage
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Trust & Transparency
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Estimates are provided for informational and educational planning purposes. Deterministic mathematical formulas are independently verified and open.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>
                <Link href="/privacy" className="hover:text-slate-900 underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 underline">
                  Methodology & Formulas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} LifeCalc Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-400">
              Crafted with precision & care
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
