import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';

export const emiInputSchema = z.object({
  principal: z.number().min(1000, 'Loan amount must be at least ₹1,000').max(1000000000, 'Amount too large'),
  annualRate: z.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate must be under 100%'),
  tenureYears: z.number().min(0.1, 'Tenure must be at least 1 month').max(50, 'Tenure maximum is 50 years'),
});

export type EmiInput = z.infer<typeof emiInputSchema>;

export function calculateEmiPure(principal: number, annualRate: number, tenureYears: number) {
  const n = Math.round(tenureYears * 12);
  let emi = 0;
  let totalInterest = 0;
  let totalPayment = 0;

  if (annualRate === 0) {
    emi = Math.round(principal / n);
    totalPayment = emi * n;
    totalInterest = 0;
  } else {
    const r = annualRate / 12 / 100;
    const factor = Math.pow(1 + r, n);
    const rawEmi = (principal * r * factor) / (factor - 1);
    emi = Math.round(rawEmi);
    totalPayment = emi * n;
    totalInterest = totalPayment - principal;
  }

  // Generate annual amortization schedule
  const r = annualRate / 12 / 100;
  let balance = principal;
  const scheduleRows = [];

  for (let year = 1; year <= Math.ceil(tenureYears); year++) {
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    const monthsInYear = Math.min(12, n - (year - 1) * 12);

    for (let m = 1; m <= monthsInYear; m++) {
      const interestMonth = balance * r;
      const principalMonth = emi - interestMonth;
      yearlyInterest += interestMonth;
      yearlyPrincipal += principalMonth;
      balance = Math.max(0, balance - principalMonth);
    }

    scheduleRows.push({
      year: `Year ${year}`,
      principalPaid: formatCurrency(Math.round(yearlyPrincipal)),
      interestPaid: formatCurrency(Math.round(yearlyInterest)),
      totalPaid: formatCurrency(Math.round(yearlyPrincipal + yearlyInterest)),
      balanceRemaining: formatCurrency(Math.round(balance)),
    });

    if (balance <= 0) break;
  }

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    principalRatio: totalPayment > 0 ? (principal / totalPayment) * 100 : 100,
    interestRatio: totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0,
    months: n,
    scheduleRows,
  };
}

export const emiCalculator: CalculatorDefinition<EmiInput> = {
  id: 'emi',
  slug: 'emi',
  name: 'EMI Calculator',
  shortTitle: 'EMI',
  category: 'money',
  subcategory: 'Loans',
  description: 'Calculate your exact monthly Equated Monthly Instalment (EMI), total interest, and complete repayment breakdown for home, car, or personal loans.',
  badge: 'Most Popular',
  seo: {
    title: 'EMI Calculator — Accurate Monthly Loan EMI & Interest Breakdown',
    description: 'Calculate monthly EMI, total interest, and view an annual amortization schedule for home loans, car loans, and personal loans with LifeCalc.',
    keywords: ['emi calculator', 'loan emi', 'home loan emi', 'car loan emi', 'personal loan interest calculator'],
    canonicalPath: '/calculators/money/emi',
  },
  inputs: [
    {
      id: 'principal',
      label: 'Loan Amount (Principal)',
      type: 'currency',
      defaultValue: 1000000,
      min: 10000,
      max: 50000000,
      step: 10000,
      description: 'The total amount you want to borrow.',
    },
    {
      id: 'annualRate',
      label: 'Annual Interest Rate (%)',
      type: 'percentage',
      defaultValue: 9,
      min: 1,
      max: 30,
      step: 0.1,
      description: 'Lender interest rate per annum.',
    },
    {
      id: 'tenureYears',
      label: 'Loan Tenure (Years)',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 30,
      step: 1,
      unit: 'years',
      description: 'Duration over which you will repay the loan.',
    },
  ],
  inputSchema: emiInputSchema,
  calculate: (inputs: EmiInput): CalculatorResult => {
    const res = calculateEmiPure(inputs.principal, inputs.annualRate, inputs.tenureYears);

    return {
      primary: {
        id: 'monthlyEmi',
        label: 'Monthly EMI',
        value: res.emi,
        formattedValue: formatCurrency(res.emi),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'totalInterest',
          label: 'Total Interest Payable',
          value: res.totalInterest,
          formattedValue: formatCurrency(res.totalInterest),
          type: 'currency',
          helpText: `${formatPercentage(res.interestRatio, 1)} of total payment`,
        },
        {
          id: 'totalPayment',
          label: 'Total Amount Payable',
          value: res.totalPayment,
          formattedValue: formatCurrency(res.totalPayment),
          type: 'currency',
          helpText: 'Principal + Total Interest',
        },
        {
          id: 'tenureMonths',
          label: 'Total Number of EMIs',
          value: res.months,
          formattedValue: `${res.months} months`,
          type: 'number',
        },
      ],
      summaryExplanation: `At ${formatPercentage(inputs.annualRate, 1)} annual interest over ${inputs.tenureYears} year${inputs.tenureYears > 1 ? 's' : ''}, your monthly EMI is ${formatCurrency(res.emi)}. You will repay ${formatIndianWords(res.totalPayment)} in total, of which ${formatIndianWords(res.totalInterest)} (${formatPercentage(res.interestRatio, 1)}) is interest.`,
      detailedExplanation: `Every monthly EMI of ${formatCurrency(res.emi)} pays off a portion of your principal and accrued interest. In earlier years, interest constitutes a larger fraction of your payment, while towards the end, payments go predominantly toward reducing principal balance.`,
      assumptions: [
        'Interest rate remains fixed throughout the loan tenure.',
        'No prepayment, loan processing fees, or foreclosure penalties are included.',
        'All EMIs are paid punctually on the monthly due date.',
      ],
      caveats: [
        'Floating rate loans may fluctuate over time as central bank benchmark repo rates change.',
        'Banks may levy an upfront processing fee (usually 0.5% - 2% + GST).',
      ],
      formula: {
        expression: 'EMI = [P × r × (1+r)ⁿ] / [(1+r)ⁿ - 1]',
        description: 'Standard reducing-balance monthly loan compounding formula.',
        variables: [
          { name: 'P', description: 'Principal loan amount' },
          { name: 'r', description: 'Monthly interest rate (Annual rate ÷ 12 ÷ 100)' },
          { name: 'n', description: 'Loan tenure in total months (Years × 12)' },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Total Repayment Breakdown',
          data: [
            { label: 'Principal Amount', value: inputs.principal },
            { label: 'Total Interest', value: res.totalInterest },
          ],
          series: [
            { key: 'Principal Amount', name: 'Principal', color: '#2563eb' },
            { key: 'Total Interest', name: 'Interest', color: '#f59e0b' },
          ],
        },
      ],
      breakdownTable: {
        title: 'Yearly Repayment Schedule',
        columns: [
          { key: 'year', label: 'Year', align: 'left' },
          { key: 'principalPaid', label: 'Principal Paid', align: 'right' },
          { key: 'interestPaid', label: 'Interest Paid', align: 'right' },
          { key: 'totalPaid', label: 'Total Paid', align: 'right' },
          { key: 'balanceRemaining', label: 'Balance Remaining', align: 'right' },
        ],
        rows: res.scheduleRows,
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '₹10 Lakh Home/Personal Loan for 5 Years at 9%',
      description: 'Standard mid-size loan repayment calculation.',
      inputs: { principal: 1000000, annualRate: 9, tenureYears: 5 },
      expectedPrimary: '₹20,758',
    },
    {
      title: '₹50 Lakh Home Loan for 20 Years at 8.5%',
      description: 'Typical long-term residential property mortgage.',
      inputs: { principal: 5000000, annualRate: 8.5, tenureYears: 20 },
      expectedPrimary: '₹43,391',
    },
  ],
  faq: [
    {
      question: 'What is reducing balance EMI vs flat rate EMI?',
      answer: 'LifeCalc calculates reducing balance EMI, which is the standard used by all RBI-regulated banks and NBFCs. In reducing balance, interest is computed only on the remaining unpaid loan balance every month.',
    },
    {
      question: 'How can I reduce my total interest payment?',
      answer: 'You can reduce interest by making occasional prepayments against principal, opting for a shorter loan tenure, or negotiating a lower interest rate with your lender.',
    },
    {
      question: 'Are processing fees and GST included in this calculation?',
      answer: 'No, this calculates pure repayment EMI. Lenders usually charge an upfront 0.5% - 2% processing fee plus 18% GST at the time of loan disbursement.',
    },
  ],
  relatedCalculatorIds: ['sip', 'can-i-afford-this', 'ctc-to-take-home', 'compound-interest'],
  disclaimer: 'Calculated results are estimates for educational and decision-support purposes. Actual EMI may vary slightly depending on your lender’s exact rounding rules and payment cycles.',
};
