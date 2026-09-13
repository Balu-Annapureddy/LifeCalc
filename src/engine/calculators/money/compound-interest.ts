import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';

export const ciInputSchema = z.object({
  principal: z.number().min(100, 'Principal must be at least ₹100').max(1000000000, 'Amount too large'),
  rate: z.number().min(0.1, 'Rate must be positive').max(100, 'Rate cannot exceed 100%'),
  years: z.number().min(0.1, 'Duration must be at least 1 month').max(50, 'Duration maximum is 50 years'),
  compoundingFrequency: z.enum(['annually', 'semiannually', 'quarterly', 'monthly']),
});

export type CiInput = z.infer<typeof ciInputSchema>;

export function calculateCompoundInterestPure(
  principal: number,
  rate: number,
  years: number,
  frequency: 'annually' | 'semiannually' | 'quarterly' | 'monthly'
) {
  const freqMap = {
    annually: 1,
    semiannually: 2,
    quarterly: 4,
    monthly: 12,
  };
  const n = freqMap[frequency];
  const totalAmount = principal * Math.pow(1 + rate / (n * 100), n * years);
  const totalInterest = totalAmount - principal;

  // Yearly timeline
  const yearlyRows = [];
  for (let y = 1; y <= Math.ceil(years); y++) {
    const curAmount = principal * Math.pow(1 + rate / (n * 100), n * y);
    yearlyRows.push({
      year: `Year ${y}`,
      principal: formatCurrency(principal),
      interestAccumulated: formatCurrency(Math.round(curAmount - principal)),
      totalBalance: formatCurrency(Math.round(curAmount)),
    });
  }

  return {
    totalAmount: Math.round(totalAmount),
    totalInterest: Math.round(totalInterest),
    principal,
    effectiveRate: (Math.pow(1 + rate / (n * 100), n) - 1) * 100,
    yearlyRows,
  };
}

export const compoundInterestCalculator: CalculatorDefinition<CiInput> = {
  id: 'compound-interest',
  slug: 'compound-interest',
  name: 'Compound Interest Calculator',
  shortTitle: 'Compound Interest',
  category: 'money',
  subcategory: 'Investments',
  description: 'Calculate future wealth and interest compounding annually, quarterly, or monthly on lump sum savings.',
  badge: 'Essential',
  seo: {
    title: 'Compound Interest Calculator — Annual, Quarterly, & Monthly Compounding',
    description: 'Calculate compound interest, effective annual rate, and maturity value for fixed deposits, bonds, and investments with LifeCalc.',
    keywords: ['compound interest calculator', 'ci calculator', 'interest compounding', 'effective annual rate'],
    canonicalPath: '/calculators/money/compound-interest',
  },
  inputs: [
    {
      id: 'principal',
      label: 'Initial Investment / Principal (₹)',
      type: 'currency',
      defaultValue: 100000,
      min: 1000,
      max: 100000000,
      step: 1000,
    },
    {
      id: 'rate',
      label: 'Annual Interest Rate (%)',
      type: 'percentage',
      defaultValue: 8,
      min: 0.5,
      max: 30,
      step: 0.25,
    },
    {
      id: 'years',
      label: 'Time Period (Years)',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 30,
      step: 1,
      unit: 'years',
    },
    {
      id: 'compoundingFrequency',
      label: 'Compounding Frequency',
      type: 'select',
      defaultValue: 'quarterly',
      options: [
        { label: 'Annually (Once a year)', value: 'annually' },
        { label: 'Semi-Annually (Twice a year)', value: 'semiannually' },
        { label: 'Quarterly (Every 3 months — standard for Indian FDs)', value: 'quarterly' },
        { label: 'Monthly (Every month)', value: 'monthly' },
      ],
    },
  ],
  inputSchema: ciInputSchema,
  calculate: (inputs: CiInput): CalculatorResult => {
    const res = calculateCompoundInterestPure(inputs.principal, inputs.rate, inputs.years, inputs.compoundingFrequency);

    return {
      primary: {
        id: 'totalAmount',
        label: 'Total Maturity Amount',
        value: res.totalAmount,
        formattedValue: formatCurrency(res.totalAmount),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'totalInterest',
          label: 'Total Compound Interest',
          value: res.totalInterest,
          formattedValue: formatCurrency(res.totalInterest),
          type: 'currency',
          helpText: `${formatIndianWords(res.totalInterest)} earned`,
        },
        {
          id: 'effectiveRate',
          label: 'Effective Annual Yield (APY)',
          value: res.effectiveRate,
          formattedValue: formatPercentage(res.effectiveRate, 2),
          type: 'percentage',
          helpText: 'True yield considering compounding frequency',
        },
      ],
      summaryExplanation: `An initial deposit of ${formatCurrency(inputs.principal)} compounded ${inputs.compoundingFrequency} at ${formatPercentage(inputs.rate, 1)} per year grows to ${formatCurrency(res.totalAmount)} after ${inputs.years} years, earning ${formatCurrency(res.totalInterest)} in compound interest.`,
      detailedExplanation: `Compounding works by adding earned interest back into the principal amount at each compounding period, so subsequent interest is calculated on a larger base. More frequent compounding (e.g. quarterly vs annually) yields a slightly higher final maturity amount.`,
      formula: {
        expression: 'A = P × (1 + r/n)ⁿᵗ',
        description: 'Compound interest formula.',
        variables: [
          { name: 'A', description: 'Final maturity amount' },
          { name: 'P', description: 'Initial principal balance' },
          { name: 'r', description: 'Annual interest rate as decimal (Rate ÷ 100)' },
          { name: 'n', description: 'Number of times interest is compounded per year' },
          { name: 't', description: 'Number of years' },
        ],
      },
      breakdownTable: {
        title: 'Yearly Balance Growth',
        columns: [
          { key: 'year', label: 'Timeline', align: 'left' },
          { key: 'principal', label: 'Principal', align: 'right' },
          { key: 'interestAccumulated', label: 'Interest Accumulated', align: 'right' },
          { key: 'totalBalance', label: 'Total Balance', align: 'right' },
        ],
        rows: res.yearlyRows,
      },
      charts: [
        {
          type: 'donut',
          title: 'Principal vs Interest',
          data: [
            { label: 'Principal', value: inputs.principal },
            { label: 'Interest', value: res.totalInterest },
          ],
        },
      ],
      raw: res,
    };
  },
  examples: [
    {
      title: '₹1 Lakh at 8% for 5 years compounded quarterly',
      description: 'Standard bank Fixed Deposit calculation.',
      inputs: { principal: 100000, rate: 8, years: 5, compoundingFrequency: 'quarterly' },
      expectedPrimary: '₹1,48,595',
    },
  ],
  faq: [
    {
      question: 'How do Indian bank Fixed Deposits (FDs) compound interest?',
      answer: 'Most Indian public and private sector banks compound fixed deposit interest on a quarterly basis. The interest earned in each quarter is added to the principal for the next quarter.',
    },
  ],
  relatedCalculatorIds: ['sip', 'emi', 'cagr'],
};
