'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalculatorDefinition,
  CalculatorResult,
  InputDefinition,
} from '@/engine/types';
import {
  CheckCircle2,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { formatCurrency } from '@/engine/formatters';

import { registry } from '@/engine/registry';
import { GuestAccountNudge } from './GuestAccountNudge';
import { recordMeaningfulUsage, dismissAccountPrompt } from '@/lib/guestUsage';

interface CalculatorRunnerProps {
  calculatorId: string;
  initialInputs?: Record<string, any>;
}

export const CalculatorRunner: React.FC<CalculatorRunnerProps> = ({
  calculatorId,
  initialInputs,
}) => {
  const calculator = registry.getById(calculatorId);
  if (!calculator) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Calculator not found</div>;
  }
  const relatedCalculators = registry.getRelated(calculator.id);
  // Build initial values from defaults or props
  const defaultValues = useMemo(() => {
    const vals: Record<string, any> = {};
    calculator.inputs.forEach(input => {
      vals[input.id] = initialInputs?.[input.id] !== undefined ? initialInputs[input.id] : input.defaultValue;
    });
    return vals;
  }, [calculator, initialInputs]);

  const [inputs, setInputs] = useState<Record<string, any>>(defaultValues);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<'yes' | 'no' | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Guest Account Nudge state
  const [showNudge, setShowNudge] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {});
  }, []);

  // Authoritative calculation execution
  const currentResult: CalculatorResult = useMemo(() => {
    try {
      const parsed = calculator.inputSchema.safeParse(inputs);
      if (parsed.success) {
        return calculator.calculate(parsed.data);
      }
      return calculator.calculate(defaultValues);
    } catch {
      return calculator.calculate(defaultValues);
    }
  }, [calculator, inputs, defaultValues]);

  // Track meaningful calculator engagement (settled interaction on valid result)
  React.useEffect(() => {
    if (isAuthenticated) return;
    const timer = setTimeout(() => {
      if (currentResult && currentResult.primary && currentResult.primary.value !== undefined) {
        const { shouldPrompt, currentCount } = recordMeaningfulUsage(calculator.id, isAuthenticated);
        setUsageCount(currentCount);
        if (shouldPrompt) {
          setShowNudge(true);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [inputs, calculator.id, currentResult, isAuthenticated]);

  const handleInputChange = (id: string, value: any) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const [savedScenario, setSavedScenario] = useState(false);

  const handleReset = () => {
    setInputs(defaultValues);
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calculatorId: calculator.id,
            inputs,
          }),
        });
        const data = await res.json();
        if (data.shareUrl) {
          const fullUrl = `${window.location.origin}${data.shareUrl}`;
          await navigator.clipboard.writeText(fullUrl);
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2500);
          return;
        }
      } catch {}

      // Fallback: encode query parameters
      const params = new URLSearchParams();
      Object.entries(inputs).forEach(([k, v]) => params.set(k, String(v)));
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleSaveScenario = async () => {
    try {
      const payload = {
        name: `${calculator.name} Scenario`,
        calculatorId: calculator.id,
        primaryResult: currentResult.primary.formattedValue,
        notes: currentResult.summaryExplanation,
        inputs,
      };

      // Save to server API
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Save to localStorage as backup
      const existing = JSON.parse(localStorage.getItem('lifecalc_saved') || '[]');
      localStorage.setItem('lifecalc_saved', JSON.stringify([
        {
          id: `save_${Date.now()}`,
          ...payload,
          updatedAt: 'Just now',
        },
        ...existing,
      ]));

      setSavedScenario(true);
      setTimeout(() => setSavedScenario(false), 2500);
    } catch {}
  };



  return (
    <div className="space-y-8">


      {/* Main 2-Column Calculator Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Inputs Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900">Enter Values</h2>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset defaults
            </button>
          </div>

          <div className="space-y-5">
            {calculator.inputs.map(input => (
              <InputField
                key={input.id}
                input={input}
                value={inputs[input.id]}
                onChange={val => handleInputChange(input.id, val)}
              />
            ))}
          </div>


        </div>

        {/* Right Col: Primary & Secondary Results */}
        <div className="lg:col-span-6 space-y-6">
          {/* Primary Result Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  {currentResult.primary.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Preview
                </span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-mono">
                {currentResult.primary.formattedValue}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                {currentResult.summaryExplanation}
              </p>
            </div>

            {/* Subtle decorative background circle */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Secondary Metric Cards */}
          {currentResult.secondary.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {currentResult.secondary.map(sec => (
                <div
                  key={sec.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-1"
                >
                  <div className="text-xs font-medium text-slate-500 truncate">
                    {sec.label}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    {sec.formattedValue}
                  </div>
                  {sec.helpText && (
                    <div className="text-[11px] text-slate-400 leading-tight">
                      {sec.helpText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Visual SVG Donut Chart */}
          {currentResult.charts && currentResult.charts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                {currentResult.charts[0].title || 'Breakdown Distribution'}
              </h3>
              <SimpleDonutChart data={currentResult.charts[0].data} />
            </div>
          )}

          {/* Quick Actions (Share, Bookmark, Feedback) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedShare ? 'Link Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={handleSaveScenario}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                <span>{savedScenario ? 'Saved!' : 'Save Scenario'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span>Was this helpful?</span>
              <button
                onClick={() => setFeedbackSent('yes')}
                className={`p-1.5 rounded hover:bg-slate-100 ${feedbackSent === 'yes' ? 'text-emerald-600 font-bold' : ''}`}
                title="Yes"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedbackSent('no')}
                className={`p-1.5 rounded hover:bg-slate-100 ${feedbackSent === 'no' ? 'text-rose-600 font-bold' : ''}`}
                title="No"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              {feedbackSent && <span className="text-[11px] text-emerald-600">Thanks!</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Amortization / Detailed Schedule Table Toggle */}
      {currentResult.breakdownTable && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              {currentResult.breakdownTable.title}
            </h3>
            <button
              onClick={() => setShowTable(!showTable)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>{showTable ? 'Hide Schedule' : 'View Full Schedule'}</span>
              {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showTable && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200">
                  <tr>
                    {currentResult.breakdownTable.columns.map(col => (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
                  {currentResult.breakdownTable.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/75">
                      {currentResult.breakdownTable!.columns.map(col => (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* "What Does This Mean?" Explanatory Section */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Understanding Your Result
        </h3>

        <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed space-y-4">
          <p>{currentResult.detailedExplanation || currentResult.summaryExplanation}</p>

          {currentResult.assumptions && currentResult.assumptions.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-2">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Assumptions Applied
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                {currentResult.assumptions.map((ass, i) => (
                  <li key={i}>{ass}</li>
                ))}
              </ul>
            </div>
          )}

          {currentResult.caveats && currentResult.caveats.length > 0 && (
            <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/60 space-y-2">
              <h4 className="font-semibold text-amber-900 text-xs uppercase tracking-wider">
                Important Caveats
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                {currentResult.caveats.map((cav, i) => (
                  <li key={i}>{cav}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Formula Display */}
        {currentResult.formula && (
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Mathematical Formula Used
            </h4>
            <div className="bg-slate-900 text-emerald-400 font-mono text-sm sm:text-base p-4 rounded-xl overflow-x-auto shadow-inner">
              {currentResult.formula.expression}
            </div>
            <p className="text-xs text-slate-500">{currentResult.formula.description}</p>
            {currentResult.formula.variables && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                {currentResult.formula.variables.map(v => (
                  <div key={v.name} className="flex gap-2 text-slate-600">
                    <strong className="font-mono text-slate-800 font-semibold">{v.name}:</strong>
                    <span>{v.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Frequently Asked Questions (FAQ) */}
      {calculator.faq.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h3>
          <div className="divide-y divide-slate-100">
            {calculator.faq.map((item, idx) => (
              <div key={idx} className="py-3.5">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  <span>{item.question}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaq === idx && (
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Guest Account Nudge */}
      {showNudge && (
        <GuestAccountNudge
          usageCount={usageCount}
          onDismiss={() => {
            setShowNudge(false);
            dismissAccountPrompt();
          }}
        />
      )}

      {/* Related Calculators (Requirement 24) */}
      {relatedCalculators.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Related Useful Calculators</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedCalculators.map(rel => (
              <Link
                key={rel.id}
                href={`/calculators/${rel.category}/${rel.slug}`}
                className="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                    {rel.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {rel.description}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600">
                  <span>Calculate now</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// Reusable Input Field Component
const InputField: React.FC<{
  input: InputDefinition;
  value: any;
  onChange: (val: any) => void;
}> = ({ input, value, onChange }) => {
  const isSlider = input.type === 'slider';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={input.id} className="text-xs font-semibold text-slate-700">
          {input.label}
        </label>
        {isSlider && (
          <span className="font-mono text-xs font-bold text-blue-600">
            {input.type === 'currency' ? formatCurrency(value) : value} {input.unit || ''}
          </span>
        )}
      </div>

      {input.description && (
        <p className="text-[11px] text-slate-400">{input.description}</p>
      )}

      {/* Select input */}
      {input.type === 'select' && input.options && (
        <select
          id={input.id}
          value={value}
          onChange={e => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          {input.options.map(opt => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Radio input */}
      {input.type === 'radio' && input.options && (
        <div className="grid grid-cols-2 gap-2">
          {input.options.map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                value === opt.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Slider input */}
      {isSlider && (
        <div className="space-y-2">
          <input
            id={input.id}
            type="range"
            min={input.min}
            max={input.max}
            step={input.step || 1}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      )}

      {/* Standard numeric/currency/date input */}
      {input.type !== 'select' && input.type !== 'radio' && !isSlider && (
        <div className="relative">
          {input.type === 'currency' && (
            <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
              â‚¹
            </span>
          )}
          <input
            id={input.id}
            type={input.type === 'date' ? 'date' : 'number'}
            min={input.min}
            max={input.max}
            step={input.step || 1}
            placeholder={input.placeholder}
            value={value ?? ''}
            onChange={e =>
              onChange(input.type === 'date' ? e.target.value : parseFloat(e.target.value) || 0)
            }
            className={`w-full py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono ${
              input.type === 'currency' ? 'pl-7 pr-3' : 'px-3'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Pure SVG Donut Chart (Zero hydration errors, zero bundle bloat)
const SimpleDonutChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  if (total === 0) return null;

  const colors = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6'];
  let accumulatedAngle = 0;

  const slices = data.map((item, index) => {
    const percentage = item.value / total;
    const startAngle = accumulatedAngle;
    accumulatedAngle += percentage * 360;
    return {
      label: item.label,
      value: item.value,
      percentage,
      color: colors[index % colors.length],
      startAngle,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
      {/* Visual percentage bars */}
      <div className="w-full space-y-2">
        {slices.map((slice, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.label}
              </span>
              <span className="font-mono text-slate-900 font-semibold">
                {(slice.percentage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(1, slice.percentage * 100)}%`,
                  backgroundColor: slice.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



