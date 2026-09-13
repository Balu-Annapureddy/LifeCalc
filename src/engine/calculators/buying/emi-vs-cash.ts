import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';
import { calculateEmiPure } from '../money/emi';

export const emiVsCashInputSchema = z.object({
  purchasePrice: z.number().min(1000, 'Minimum price is ₹1,000').max(50000000),
  cashDiscountPercent: z.number().min(0).max(50).default(0), // Instant discount if paying full cash
  downPayment: z.number().min(0).default(0),
  loanTenureMonths: z.number().min(3).max(84).default(12),
  loanAnnualRate: z.number().min(0).max(40).default(0), // 0 for no-cost EMI
  investmentReturnRate: z.number().min(0).max(30).default(10), // Opportunity cost: return if cash stayed invested
});

export type EmiVsCashInput = z.infer<typeof emiVsCashInputSchema>;

export function calculateEmiVsCashPure(input: EmiVsCashInput) {
  const {
    purchasePrice,
    cashDiscountPercent,
    downPayment,
    loanTenureMonths,
    loanAnnualRate,
    investmentReturnRate,
  } = input;

  // Option 1: Pay Full Cash Upfront
  const cashPaid = purchasePrice * (1 - cashDiscountPercent / 100);
  const upfrontCashCost = cashPaid;

  // Option 2: Pay via EMI
  const actualDownPayment = Math.min(downPayment, purchasePrice);
  const loanAmount = Math.max(0, purchasePrice - actualDownPayment);
  const tenureYears = loanTenureMonths / 12;

  const emiRes = calculateEmiPure(loanAmount, loanAnnualRate, tenureYears);
  const totalEmiRepayment = actualDownPayment + (loanAnnualRate === 0 ? loanAmount : emiRes.totalPayment);
  const totalInterestPaid = emiRes.totalInterest;

  // Opportunity Cost Analysis:
  // If you take the EMI instead of paying cash upfront, the retained cash (cashPaid - actualDownPayment)
  // could remain invested at investmentReturnRate% per annum over the tenure.
  const cashSavedUpfront = Math.max(0, cashPaid - actualDownPayment);
  const monthlyRate = investmentReturnRate / 12 / 100;
  
  // Approximate opportunity interest earned on remaining balance amortized
  const opportunityReturnsEarned = Math.round(cashSavedUpfront * (investmentReturnRate / 100) * (tenureYears / 2));

  // Net effective cost of EMI after opportunity returns
  const netEffectiveEmiCost = totalEmiRepayment - opportunityReturnsEarned;

  const costDifference = Math.abs(netEffectiveEmiCost - upfrontCashCost);
  const isEmiBetter = netEffectiveEmiCost < upfrontCashCost;

  let recommendation: string;
  let badgeColor: 'green' | 'blue' | 'yellow' = 'green';

  if (isEmiBetter && costDifference > 500) {
    recommendation = 'Opt for EMI (Keep cash invested)';
    badgeColor = 'green';
  } else if (!isEmiBetter && costDifference > 500) {
    recommendation = 'Pay Cash Upfront (Save on loan interest)';
    badgeColor = 'blue';
  } else {
    recommendation = 'Practically Equal (Choose based on cash comfort)';
    badgeColor = 'yellow';
  }

  return {
    recommendation,
    badgeColor,
    cashPaid: Math.round(cashPaid),
    totalEmiRepayment: Math.round(totalEmiRepayment),
    monthlyEmi: emiRes.emi,
    totalInterestPaid: Math.round(totalInterestPaid),
    opportunityReturnsEarned,
    netEffectiveEmiCost: Math.round(netEffectiveEmiCost),
    costDifference: Math.round(costDifference),
    isEmiBetter,
  };
}

export const emiVsCashCalculator: CalculatorDefinition<EmiVsCashInput> = {
  id: 'emi-vs-cash',
  slug: 'emi-vs-cash',
  name: 'EMI vs Cash Calculator',
  shortTitle: 'EMI vs Cash',
  category: 'buying',
  subcategory: 'Purchases',
  description: 'Decide whether to pay for a big purchase upfront in cash or opt for EMI while keeping your liquid savings invested in mutual funds or fixed deposits.',
  badge: 'Decision Tool',
  seo: {
    title: 'EMI vs Cash Calculator — Should You Pay Full Cash or Take an EMI?',
    description: 'Compare paying full cash upfront vs financing on EMI considering investment returns, loan interest, and upfront discounts on LifeCalc.',
    keywords: ['emi vs cash', 'pay cash or emi', 'is no cost emi worth it', 'opportunity cost emi vs full payment'],
    canonicalPath: '/calculators/buying/emi-vs-cash',
  },
  inputs: [
    {
      id: 'purchasePrice',
      label: 'Item Purchase Price (₹)',
      type: 'currency',
      defaultValue: 100000,
      min: 5000,
      max: 10000000,
      step: 5000,
    },
    {
      id: 'cashDiscountPercent',
      label: 'Instant Cash Discount Available (%)',
      type: 'percentage',
      defaultValue: 5,
      min: 0,
      max: 30,
      step: 1,
      description: 'Discount offered by seller for upfront full payment.',
    },
    {
      id: 'downPayment',
      label: 'Down Payment for EMI (₹)',
      type: 'currency',
      defaultValue: 20000,
      min: 0,
      max: 5000000,
      step: 5000,
    },
    {
      id: 'loanTenureMonths',
      label: 'EMI Tenure (Months)',
      type: 'slider',
      defaultValue: 12,
      min: 3,
      max: 36,
      step: 3,
      unit: 'months',
    },
    {
      id: 'loanAnnualRate',
      label: 'EMI Interest Rate (%)',
      type: 'percentage',
      defaultValue: 0,
      min: 0,
      max: 30,
      step: 1,
      description: '0% for No-Cost EMI, or 13%–16% for standard credit card EMI.',
    },
    {
      id: 'investmentReturnRate',
      label: 'Expected Return if Cash Kept Invested (%)',
      type: 'percentage',
      defaultValue: 10,
      min: 0,
      max: 25,
      step: 0.5,
      description: 'Return on liquid savings (e.g., 7% FD or 12% mutual funds).',
    },
  ],
  inputSchema: emiVsCashInputSchema,
  calculate: (inputs: EmiVsCashInput): CalculatorResult => {
    const res = calculateEmiVsCashPure(inputs);

    return {
      primary: {
        id: 'recommendation',
        label: 'Best Financial Strategy',
        value: res.recommendation,
        formattedValue: res.recommendation,
        type: 'badge',
        badgeColor: res.badgeColor,
        isPrimary: true,
      },
      secondary: [
        {
          id: 'cashPaid',
          label: 'Total Cost: Full Cash',
          value: res.cashPaid,
          formattedValue: formatCurrency(res.cashPaid),
          type: 'currency',
          helpText: 'Includes upfront cash discount',
        },
        {
          id: 'totalEmiRepayment',
          label: 'Total Outflow: EMI Mode',
          value: res.totalEmiRepayment,
          formattedValue: formatCurrency(res.totalEmiRepayment),
          type: 'currency',
          helpText: `${formatCurrency(res.monthlyEmi)}/mo EMI`,
        },
        {
          id: 'opportunityReturns',
          label: 'Opportunity Returns Earned',
          value: res.opportunityReturnsEarned,
          formattedValue: formatCurrency(res.opportunityReturnsEarned),
          type: 'currency',
          helpText: 'From investing retained cash',
        },
        {
          id: 'costDifference',
          label: 'Net Financial Difference',
          value: res.costDifference,
          formattedValue: formatCurrency(res.costDifference),
          type: 'currency',
        },
      ],
      summaryExplanation: `Recommendation: ${res.recommendation}. Paying full cash requires an immediate outflow of ${formatCurrency(res.cashPaid)}. Choosing EMI results in total payments of ${formatCurrency(res.totalEmiRepayment)} (${formatCurrency(res.monthlyEmi)}/month), but allows your remaining liquid cash to generate an estimated ${formatCurrency(res.opportunityReturnsEarned)} in investment returns over the tenure.`,
      charts: [
        {
          type: 'donut',
          title: 'Total Outflow Comparison',
          data: [
            { label: 'Full Cash Outflow', value: res.cashPaid },
            { label: 'Net Effective EMI Cost', value: res.netEffectiveEmiCost },
          ],
        },
      ],
      breakdownTable: {
        title: 'Option Breakdown Comparison',
        columns: [
          { key: 'metric', label: 'Financial Consideration', align: 'left' },
          { key: 'cash', label: 'Option A: Pay Cash', align: 'right' },
          { key: 'emi', label: 'Option B: Take EMI', align: 'right' },
        ],
        rows: [
          { metric: 'Immediate Upfront Payment', cash: formatCurrency(res.cashPaid), emi: formatCurrency(inputs.downPayment) },
          { metric: 'Monthly Payment', cash: '₹0', emi: `${formatCurrency(res.monthlyEmi)} / mo` },
          { metric: 'Total Interest / Extra Cost', cash: '₹0', emi: formatCurrency(res.totalInterestPaid) },
          { metric: 'Estimated Investment Returns on Retained Cash', cash: '₹0', emi: formatCurrency(res.opportunityReturnsEarned) },
          { metric: 'Net Effective Cost', cash: formatCurrency(res.cashPaid), emi: formatCurrency(res.netEffectiveEmiCost) },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '₹1 Lakh Laptop with 5% Cash Discount vs 0% No-Cost EMI',
      description: 'Comparing store discount with retaining cash in mutual funds.',
      inputs: {
        purchasePrice: 100000,
        cashDiscountPercent: 5,
        downPayment: 0,
        loanTenureMonths: 12,
        loanAnnualRate: 0,
        investmentReturnRate: 10,
      },
      expectedPrimary: 'Pay Cash Upfront (Save on loan interest)',
    },
  ],
  faq: [
    {
      question: 'Is No-Cost EMI completely free?',
      answer: 'In India, lenders achieve "no-cost" by converting the upfront product discount into the interest component charged by the bank. However, credit card companies charge an upfront processing fee (₹199 to ₹299) and 18% GST on the interest portion of every monthly statement.',
    },
  ],
  relatedCalculatorIds: ['can-i-afford-this', 'emi', 'sip'],
};
