import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatPercentage } from '../../formatters';
import { calculateEmiPure } from '../money/emi';

export const affordInputSchema = z.object({
  monthlyIncome: z.number().min(1000, 'Monthly income must be at least ₹1,000').max(100000000),
  monthlyExpenses: z.number().min(0, 'Expenses cannot be negative').max(100000000),
  existingEmis: z.number().min(0, 'Existing EMIs cannot be negative').max(100000000).default(0),
  currentSavings: z.number().min(0, 'Savings cannot be negative').max(1000000000).default(0),
  itemPrice: z.number().min(100, 'Item price must be at least ₹100').max(100000000),
  paymentMode: z.enum(['cash', 'emi']),
  downPayment: z.number().min(0).default(0),
  emiTenureMonths: z.number().min(3).max(84).default(12),
  emiInterestRate: z.number().min(0).max(40).default(0), // 0 for no-cost EMI
});

export type AffordInput = z.infer<typeof affordInputSchema>;

export function calculateAffordabilityPure(input: AffordInput) {
  const {
    monthlyIncome,
    monthlyExpenses,
    existingEmis,
    currentSavings,
    itemPrice,
    paymentMode,
    downPayment,
    emiTenureMonths,
    emiInterestRate,
  } = input;

  // Monthly cash flow before purchase
  const freeCashBefore = Math.max(0, monthlyIncome - monthlyExpenses - existingEmis);
  const currentDti = ((existingEmis) / monthlyIncome) * 100; // Debt to Income %

  let newMonthlyCommitment = 0;
  let upfrontCashSpent = 0;
  let emiCalculated = 0;

  if (paymentMode === 'cash') {
    upfrontCashSpent = itemPrice;
    newMonthlyCommitment = 0;
  } else {
    upfrontCashSpent = Math.min(downPayment, itemPrice);
    const loanAmount = Math.max(0, itemPrice - upfrontCashSpent);
    if (loanAmount > 0) {
      const emiRes = calculateEmiPure(loanAmount, emiInterestRate, emiTenureMonths / 12);
      emiCalculated = emiRes.emi;
      newMonthlyCommitment = emiCalculated;
    }
  }

  // Monthly cash flow after purchase
  const freeCashAfter = monthlyIncome - monthlyExpenses - existingEmis - newMonthlyCommitment;
  const newDti = ((existingEmis + newMonthlyCommitment) / monthlyIncome) * 100;

  // Savings balance after upfront payment
  const remainingSavings = currentSavings - upfrontCashSpent;
  const emergencyFundMonths = monthlyExpenses > 0 ? remainingSavings / monthlyExpenses : 12;

  // Scoring criteria
  // 🟢 Safe:
  // 1. Free cash after > 20% of income
  // 2. New DTI <= 40%
  // 3. Emergency savings >= 3 months of expenses
  // 🟡 Caution:
  // 1. Free cash after > 0 but < 20%
  // 2. New DTI between 40% and 55%
  // 3. Emergency savings between 1 and 3 months
  // 🔴 High Risk:
  // 1. Free cash after <= 0 (deficit!)
  // 2. New DTI > 55%
  // 3. Savings wiped out (remainingSavings < 0 or < 1 month)

  let verdict: 'Safe & Affordable' | 'Proceed with Caution' | 'High Financial Risk';
  let badgeColor: 'green' | 'yellow' | 'red';
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];

  if (freeCashAfter < 0) {
    verdict = 'High Financial Risk';
    badgeColor = 'red';
    riskFactors.push(`Monthly budget goes into a deficit of ${formatCurrency(Math.abs(freeCashAfter))}/month.`);
  } else if (remainingSavings < 0) {
    verdict = 'High Financial Risk';
    badgeColor = 'red';
    riskFactors.push(`Upfront payment exceeds your total liquid savings by ${formatCurrency(Math.abs(remainingSavings))}.`);
  } else if (newDti > 50) {
    verdict = 'High Financial Risk';
    badgeColor = 'red';
    riskFactors.push(`Total EMIs consume ${formatPercentage(newDti, 1)} of your monthly income (recommended ceiling is 40%).`);
  } else if (emergencyFundMonths < 2 && currentSavings > 0) {
    verdict = 'Proceed with Caution';
    badgeColor = 'yellow';
    riskFactors.push(`Your remaining liquid emergency fund drops to only ${emergencyFundMonths.toFixed(1)} months of expenses.`);
  } else if (newDti > 35) {
    verdict = 'Proceed with Caution';
    badgeColor = 'yellow';
    riskFactors.push(`Total EMIs reach ${formatPercentage(newDti, 1)} of income, narrowing your monthly cushion.`);
  } else {
    verdict = 'Safe & Affordable';
    badgeColor = 'green';
    positiveFactors.push(`Comfortable remaining cash flow of ${formatCurrency(freeCashAfter)} every month.`);
    positiveFactors.push(`Total EMI commitment is only ${formatPercentage(newDti, 1)} of income (well within healthy 40% guideline).`);
    if (currentSavings > 0) {
      positiveFactors.push(`Liquid emergency runway retains ${emergencyFundMonths.toFixed(1)} months of living expenses.`);
    }
  }

  return {
    verdict,
    badgeColor,
    freeCashBefore: Math.round(freeCashBefore),
    freeCashAfter: Math.round(freeCashAfter),
    newMonthlyCommitment: Math.round(newMonthlyCommitment),
    upfrontCashSpent: Math.round(upfrontCashSpent),
    remainingSavings: Math.round(remainingSavings),
    newDti: Math.round(newDti * 10) / 10,
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    riskFactors,
    positiveFactors,
  };
}

export const canIAffordThisCalculator: CalculatorDefinition<AffordInput> = {
  id: 'can-i-afford-this',
  slug: 'can-i-afford-this',
  name: 'Can I Afford This? Calculator',
  shortTitle: 'Can I Afford This?',
  category: 'buying',
  subcategory: 'Decisions',
  description: 'Evaluate whether you can safely afford a big-ticket purchase (laptop, phone, car, holiday) without draining your emergency savings or over-leveraging with EMI debt.',
  badge: 'Decision Tool',
  seo: {
    title: 'Can I Afford This? Calculator — Purchase Affordability & Cash Flow Risk',
    description: 'Check if you can afford to buy a phone, laptop, car or luxury item in cash or on EMI without risking your monthly savings or emergency fund.',
    keywords: ['can i afford this', 'affordability calculator', 'can i afford a car', 'laptop affordability test', 'emi vs cash decision'],
    canonicalPath: '/calculators/buying/can-i-afford-this',
  },
  inputs: [
    {
      id: 'monthlyIncome',
      label: 'Monthly Take-Home Income (₹)',
      type: 'currency',
      defaultValue: 75000,
      min: 5000,
      max: 10000000,
      step: 5000,
      description: 'Net cash credited to your bank account every month.',
    },
    {
      id: 'monthlyExpenses',
      label: 'Monthly Living Expenses (₹)',
      type: 'currency',
      defaultValue: 35000,
      min: 0,
      max: 10000000,
      step: 2000,
      description: 'Rent, groceries, bills, dining, subscriptions.',
    },
    {
      id: 'existingEmis',
      label: 'Existing Monthly EMIs (₹)',
      type: 'currency',
      defaultValue: 10000,
      min: 0,
      max: 5000000,
      step: 1000,
      description: 'Home loan, bike EMI, personal loan already being paid.',
    },
    {
      id: 'currentSavings',
      label: 'Total Liquid Savings / Bank Balance (₹)',
      type: 'currency',
      defaultValue: 150000,
      min: 0,
      max: 50000000,
      step: 10000,
      description: 'Savings account, emergency funds, liquid FDs.',
    },
    {
      id: 'itemPrice',
      label: 'Purchase Price of the Item (₹)',
      type: 'currency',
      defaultValue: 120000,
      min: 1000,
      max: 50000000,
      step: 5000,
      description: 'Cost of the phone, laptop, vehicle, or product.',
    },
    {
      id: 'paymentMode',
      label: 'Payment Method',
      type: 'radio',
      defaultValue: 'emi',
      options: [
        { label: 'Pay on EMI / Loan', value: 'emi' },
        { label: 'Pay Full Cash Upfront', value: 'cash' },
      ],
    },
    {
      id: 'downPayment',
      label: 'Upfront Down Payment (if EMI) (₹)',
      type: 'currency',
      defaultValue: 20000,
      min: 0,
      max: 50000000,
      step: 5000,
    },
    {
      id: 'emiTenureMonths',
      label: 'EMI Duration (Months)',
      type: 'slider',
      defaultValue: 12,
      min: 3,
      max: 36,
      step: 3,
      unit: 'months',
    },
    {
      id: 'emiInterestRate',
      label: 'EMI Interest Rate (% p.a.)',
      type: 'percentage',
      defaultValue: 0,
      min: 0,
      max: 30,
      step: 1,
      description: '0% for No-Cost EMI, or 13%–16% for credit card EMI.',
    },
  ],
  inputSchema: affordInputSchema,
  calculate: (inputs: AffordInput): CalculatorResult => {
    const res = calculateAffordabilityPure(inputs);

    return {
      primary: {
        id: 'verdict',
        label: 'Affordability Verdict',
        value: res.verdict,
        formattedValue: res.verdict,
        type: 'badge',
        badgeColor: res.badgeColor,
        isPrimary: true,
      },
      secondary: [
        {
          id: 'freeCashAfter',
          label: 'Monthly Free Cash Remaining',
          value: res.freeCashAfter,
          formattedValue: formatCurrency(res.freeCashAfter),
          type: 'currency',
          badgeColor: res.freeCashAfter > 10000 ? 'green' : res.freeCashAfter > 0 ? 'yellow' : 'red',
          helpText: 'Money left after all bills & EMIs',
        },
        {
          id: 'newMonthlyCommitment',
          label: 'New Monthly EMI',
          value: res.newMonthlyCommitment,
          formattedValue: formatCurrency(res.newMonthlyCommitment),
          type: 'currency',
        },
        {
          id: 'newDti',
          label: 'Total Debt-to-Income (DTI)',
          value: res.newDti,
          formattedValue: formatPercentage(res.newDti, 1),
          type: 'percentage',
          helpText: 'Healthy ceiling is below 40%',
        },
        {
          id: 'emergencyRunway',
          label: 'Emergency Fund Runway',
          value: res.emergencyFundMonths,
          formattedValue: `${res.emergencyFundMonths} months`,
          type: 'text',
          helpText: 'Recommended buffer is 3 to 6 months',
        },
      ],
      summaryExplanation: `Verdict: ${res.verdict}. For a ${formatCurrency(inputs.itemPrice)} purchase, your monthly free cash after all expenses and EMIs becomes ${formatCurrency(res.freeCashAfter)}. Your debt-to-income ratio reaches ${formatPercentage(res.newDti, 1)}.`,
      detailedExplanation: res.riskFactors.length > 0
        ? `Cautions Identified:\n• ${res.riskFactors.join('\n• ')}`
        : `Healthy Financial Profile:\n• ${res.positiveFactors.join('\n• ')}`,
      assumptions: [
        'Monthly take-home income remains uninterrupted during the tenure.',
        'No emergency medical expenses or unexpected unplanned costs arise.',
        'Debt-to-Income (DTI) benchmark is standard conservative banking 40%.',
      ],
      caveats: [
        'No-cost EMIs often involve processing fees (₹199 - ₹499) and 18% GST on the discount value charged by credit card issuers.',
      ],
      charts: [
        {
          type: 'donut',
          title: 'Monthly Income Allocation After Purchase',
          data: [
            { label: 'Living Expenses', value: inputs.monthlyExpenses },
            { label: 'Existing EMIs', value: inputs.existingEmis },
            { label: 'New Item EMI', value: res.newMonthlyCommitment },
            { label: 'Remaining Savings/Cash', value: Math.max(0, res.freeCashAfter) },
          ],
        },
      ],
      raw: res,
    };
  },
  examples: [
    {
      title: '₹1.2 Lakh Laptop on ₹75,000 Salary (No-Cost EMI)',
      description: 'Buying a high-end work computer over 12 months.',
      inputs: {
        monthlyIncome: 75000,
        monthlyExpenses: 35000,
        existingEmis: 10000,
        currentSavings: 150000,
        itemPrice: 120000,
        paymentMode: 'emi',
        downPayment: 20000,
        emiTenureMonths: 12,
        emiInterestRate: 0,
      },
      expectedPrimary: 'Safe & Affordable',
    },
  ],
  faq: [
    {
      question: 'What is the 50/30/20 budget rule for big purchases?',
      answer: 'The 50/30/20 rule suggests spending 50% of take-home income on needs (rent, food, healthcare), 30% on wants (gadgets, vacations, shopping), and 20% directly into savings and investments. If your new purchase fits into the 30% wants bucket without encroaching on the 20% savings, it is considered safe.',
    },
  ],
  relatedCalculatorIds: ['emi', 'ctc-to-take-home', 'sip'],
};
