import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatPercentage } from '../../formatters';

export const cagrInputSchema = z.object({
  initialValue: z.number().min(1, 'Initial value must be greater than 0'),
  finalValue: z.number().min(1, 'Final value must be greater than 0'),
  durationYears: z.number().min(0.1, 'Duration must be at least 0.1 years').max(100, 'Duration max 100 years'),
});

export type CagrInput = z.infer<typeof cagrInputSchema>;

export function calculateCagrPure(initialValue: number, finalValue: number, durationYears: number) {
  const cagr = (Math.pow(finalValue / initialValue, 1 / durationYears) - 1) * 100;
  const absoluteGrowth = finalValue - initialValue;
  const absolutePercentage = (absoluteGrowth / initialValue) * 100;

  return {
    cagr: Number(cagr.toFixed(4)),
    absoluteGrowth: Math.round(absoluteGrowth),
    absolutePercentage: Number(absolutePercentage.toFixed(2)),
  };
}

export const cagrCalculator: CalculatorDefinition<CagrInput> = {
  id: 'cagr',
  slug: 'cagr',
  name: 'CAGR Calculator',
  shortTitle: 'CAGR',
  category: 'money',
  subcategory: 'Investments',
  description: 'Calculate the Compound Annual Growth Rate (CAGR) of any business, stock, portfolio, or investment.',
  badge: 'Analytics',
  seo: {
    title: 'CAGR Calculator — Compound Annual Growth Rate Formula & Analysis',
    description: 'Calculate your annualised compound growth rate (CAGR) from initial and final portfolio values over any number of years on LifeCalc.',
    keywords: ['cagr calculator', 'compound annual growth rate', 'annualized return calculator', 'investment cagr'],
    canonicalPath: '/calculators/money/cagr',
  },
  inputs: [
    {
      id: 'initialValue',
      label: 'Initial Investment / Starting Value (₹)',
      type: 'currency',
      defaultValue: 100000,
      min: 100,
      max: 1000000000,
      step: 1000,
    },
    {
      id: 'finalValue',
      label: 'Final Value / Maturity Balance (₹)',
      type: 'currency',
      defaultValue: 250000,
      min: 100,
      max: 1000000000,
      step: 1000,
    },
    {
      id: 'durationYears',
      label: 'Duration (Years)',
      type: 'number',
      defaultValue: 5,
      min: 0.25,
      max: 50,
      step: 0.5,
      unit: 'years',
    },
  ],
  inputSchema: cagrInputSchema,
  calculate: (inputs: CagrInput): CalculatorResult => {
    const res = calculateCagrPure(inputs.initialValue, inputs.finalValue, inputs.durationYears);

    return {
      primary: {
        id: 'cagr',
        label: 'Compound Annual Growth Rate (CAGR)',
        value: res.cagr,
        formattedValue: formatPercentage(res.cagr, 2),
        type: 'percentage',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'absoluteGrowth',
          label: 'Total Value Gain',
          value: res.absoluteGrowth,
          formattedValue: formatCurrency(res.absoluteGrowth),
          type: 'currency',
        },
        {
          id: 'absolutePercentage',
          label: 'Total Absolute Return',
          value: res.absolutePercentage,
          formattedValue: formatPercentage(res.absolutePercentage, 2),
          type: 'percentage',
        },
      ],
      summaryExplanation: `Growing from ${formatCurrency(inputs.initialValue)} to ${formatCurrency(inputs.finalValue)} over ${inputs.durationYears} years represents a Compound Annual Growth Rate (CAGR) of ${formatPercentage(res.cagr, 2)}. Your investment gained a total of ${formatCurrency(res.absoluteGrowth)} (${formatPercentage(res.absolutePercentage, 2)} absolute return).`,
      detailedExplanation: `CAGR smooths out the peaks and valleys of market fluctuations, showing the constant annual rate of return that would have taken an investment from its initial value to its final value assuming profits were reinvested annually.`,
      formula: {
        expression: 'CAGR = (Ending Value / Beginning Value)^(1 / Years) - 1',
        description: 'CAGR geometric progression formula.',
        variables: [
          { name: 'Ending Value', description: 'Value of investment at the end of period' },
          { name: 'Beginning Value', description: 'Value of investment at the start' },
          { name: 'Years', description: 'Holding period in years' },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '₹1 Lakh to ₹2 Lakh in 5 Years',
      description: 'Doubling money over a five-year period.',
      inputs: { initialValue: 100000, finalValue: 200000, durationYears: 5 },
      expectedPrimary: '14.87%',
    },
  ],
  faq: [
    {
      question: 'What is the difference between Absolute Return and CAGR?',
      answer: 'Absolute return only measures the percentage difference between the start and end values without accounting for the passage of time. CAGR measures the annualized compounding rate, making it possible to compare investments of different durations.',
    },
  ],
  relatedCalculatorIds: ['sip', 'compound-interest'],
};
