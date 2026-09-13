import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';

export const sipInputSchema = z.object({
  monthlyInvestment: z.number().min(100, 'Minimum monthly investment is ₹100').max(10000000, 'Amount too large'),
  expectedReturnRate: z.number().min(1, 'Expected return must be at least 1%').max(50, 'Return rate unrealistic above 50%'),
  investmentPeriodYears: z.number().min(1, 'Minimum period is 1 year').max(50, 'Maximum period is 50 years'),
});

export type SipInput = z.infer<typeof sipInputSchema>;

export function calculateSipPure(monthlyInvestment: number, expectedReturnRate: number, years: number) {
  const n = Math.round(years * 12);
  const totalInvested = monthlyInvestment * n;
  let futureValue = totalInvested;
  let wealthGain = 0;

  const yearlyRows = [];

  if (expectedReturnRate <= 0) {
    futureValue = totalInvested;
    wealthGain = 0;

    for (let y = 1; y <= years; y++) {
      const months = y * 12;
      const yInvested = monthlyInvestment * months;
      yearlyRows.push({
        year: `Year ${y}`,
        invested: formatCurrency(Math.round(yInvested)),
        wealthGained: formatCurrency(0),
        totalValue: formatCurrency(Math.round(yInvested)),
      });
    }
  } else {
    const i = expectedReturnRate / 12 / 100;
    // Future value of an annuity due (payments at beginning of period)
    const factor = Math.pow(1 + i, n);
    futureValue = monthlyInvestment * ((factor - 1) / i) * (1 + i);
    wealthGain = futureValue - totalInvested;

    // Year-by-year growth
    for (let y = 1; y <= years; y++) {
      const months = y * 12;
      const yFactor = Math.pow(1 + i, months);
      const yFv = monthlyInvestment * ((yFactor - 1) / i) * (1 + i);
      const yInvested = monthlyInvestment * months;
      yearlyRows.push({
        year: `Year ${y}`,
        invested: formatCurrency(Math.round(yInvested)),
        wealthGained: formatCurrency(Math.round(yFv - yInvested)),
        totalValue: formatCurrency(Math.round(yFv)),
      });
    }
  }

  return {
    futureValue: Math.round(futureValue),
    totalInvested: Math.round(totalInvested),
    wealthGain: Math.round(wealthGain),
    wealthRatio: futureValue > 0 ? (wealthGain / futureValue) * 100 : 0,
    investedRatio: futureValue > 0 ? (totalInvested / futureValue) * 100 : 100,
    yearlyRows,
  };
}

export const sipCalculator: CalculatorDefinition<SipInput> = {
  id: 'sip',
  slug: 'sip',
  name: 'SIP Calculator',
  shortTitle: 'SIP',
  category: 'money',
  subcategory: 'Investments',
  description: 'Calculate expected future returns on your Systematic Investment Plan (SIP) in mutual funds or index funds over time.',
  badge: 'High Returns',
  seo: {
    title: 'SIP Calculator — Systematic Investment Plan Future Value & Returns',
    description: 'Calculate future wealth gained from monthly mutual fund SIP investments with compound growth charts and yearly breakdowns on LifeCalc.',
    keywords: ['sip calculator', 'mutual fund sip', 'systematic investment plan', 'sip returns calculator', 'sip compound growth'],
    canonicalPath: '/calculators/money/sip',
  },
  inputs: [
    {
      id: 'monthlyInvestment',
      label: 'Monthly Investment (₹)',
      type: 'currency',
      defaultValue: 5000,
      min: 500,
      max: 1000000,
      step: 500,
      description: 'Amount you deposit each month.',
    },
    {
      id: 'expectedReturnRate',
      label: 'Expected Annual Return Rate (%)',
      type: 'percentage',
      defaultValue: 12,
      min: 1,
      max: 30,
      step: 0.5,
      description: 'Historical equity mutual fund return assumption (typically 12% - 14%).',
    },
    {
      id: 'investmentPeriodYears',
      label: 'Investment Period (Years)',
      type: 'slider',
      defaultValue: 15,
      min: 1,
      max: 40,
      step: 1,
      unit: 'years',
      description: 'How many years you plan to continue investing.',
    },
  ],
  inputSchema: sipInputSchema,
  calculate: (inputs: SipInput): CalculatorResult => {
    const res = calculateSipPure(inputs.monthlyInvestment, inputs.expectedReturnRate, inputs.investmentPeriodYears);

    return {
      primary: {
        id: 'futureValue',
        label: 'Expected Total Corpus',
        value: res.futureValue,
        formattedValue: formatCurrency(res.futureValue),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'totalInvested',
          label: 'Total Amount Invested',
          value: res.totalInvested,
          formattedValue: formatCurrency(res.totalInvested),
          type: 'currency',
          helpText: `${formatPercentage(res.investedRatio, 1)} of total corpus`,
        },
        {
          id: 'wealthGain',
          label: 'Estimated Wealth Gained',
          value: res.wealthGain,
          formattedValue: formatCurrency(res.wealthGain),
          type: 'currency',
          helpText: `${formatPercentage(res.wealthRatio, 1)} compounded gain`,
        },
      ],
      summaryExplanation: `Investing ${formatCurrency(inputs.monthlyInvestment)} every month for ${inputs.investmentPeriodYears} years at an assumed ${formatPercentage(inputs.expectedReturnRate, 1)} return results in a total investment of ${formatIndianWords(res.totalInvested)}. Your estimated maturity corpus is ${formatIndianWords(res.futureValue)}, generating an estimated ${formatIndianWords(res.wealthGain)} in wealth creation.`,
      detailedExplanation: `The power of compounding is most visible in the later years of a SIP. While your monthly contribution remains constant, returns generated in previous years also earn returns, dramatically accelerating growth after 10–15 years.`,
      assumptions: [
        'Returns are compounded monthly assuming timely investments.',
        'Market returns are estimated at a steady annual rate (market volatility is not modeled).',
        'Inflation and taxes on capital gains (LTCG) are not subtracted.',
      ],
      caveats: [
        'Mutual fund investments are subject to market risks. Past returns are not guarantees of future performance.',
        'Equity mutual funds in India attract 12.5% LTCG tax on gains exceeding ₹1.25 Lakh per financial year.',
      ],
      formula: {
        expression: 'FV = P × [((1+i)ⁿ - 1) / i] × (1+i)',
        description: 'Future Value of an Annuity Due with monthly compounding.',
        variables: [
          { name: 'P', description: 'Monthly investment installment' },
          { name: 'i', description: 'Monthly expected rate of return (Annual Rate ÷ 12 ÷ 100)' },
          { name: 'n', description: 'Total number of monthly contributions (Years × 12)' },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Corpus Composition',
          data: [
            { label: 'Amount Invested', value: res.totalInvested },
            { label: 'Wealth Gained', value: res.wealthGain },
          ],
          series: [
            { key: 'Amount Invested', name: 'Invested', color: '#3b82f6' },
            { key: 'Wealth Gained', name: 'Gains', color: '#10b981' },
          ],
        },
      ],
      breakdownTable: {
        title: 'Yearly Growth Trajectory',
        columns: [
          { key: 'year', label: 'Timeline', align: 'left' },
          { key: 'invested', label: 'Total Invested', align: 'right' },
          { key: 'wealthGained', label: 'Estimated Growth', align: 'right' },
          { key: 'totalValue', label: 'Corpus Balance', align: 'right' },
        ],
        rows: res.yearlyRows,
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '₹5,000/month for 20 years at 12%',
      description: 'Long-term equity discipline creating a multi-crore corpus.',
      inputs: { monthlyInvestment: 5000, expectedReturnRate: 12, investmentPeriodYears: 20 },
      expectedPrimary: '₹49,95,740',
    },
    {
      title: '₹10,000/month for 10 years at 12%',
      description: 'Mid-term goal investment plan.',
      inputs: { monthlyInvestment: 10000, expectedReturnRate: 12, investmentPeriodYears: 10 },
      expectedPrimary: '₹23,23,391',
    },
  ],
  faq: [
    {
      question: 'What is a realistic expected return rate for SIP in India?',
      answer: 'Broad-market Nifty 50 or broad Indian diversified mutual funds have historically delivered 11%–14% CAGR over 10+ year holding horizons. For debt funds, 6%–8% is more appropriate.',
    },
    {
      question: 'Can I increase my SIP amount over time?',
      answer: 'Yes, that is called a Step-Up SIP. Increasing your monthly investment by 5%–10% each year can nearly double your final corpus compared to a flat SIP.',
    },
  ],
  relatedCalculatorIds: ['emi', 'compound-interest', 'cagr', 'can-i-afford-this'],
  disclaimer: 'Mutual fund returns are market-linked and not guaranteed. This calculator provides educational mathematical projections.',
};
