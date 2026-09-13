import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';

export const ctcInputSchema = z.object({
  annualCtc: z.number().min(100000, 'Minimum CTC is ₹1,00,000').max(100000000, 'CTC too large'),
  regime: z.enum(['new', 'old']),
  bonusPercent: z.number().min(0).max(50).default(0), // variable pay %
  employerPfIncludedInCtc: z.boolean().default(true),
  customMonthlyDeductions: z.number().min(0).default(0),
  oldRegimeDeductions: z.number().min(0).max(1500000).default(150000), // 80C + 80D + HRA
});

export type CtcInput = z.infer<typeof ctcInputSchema>;

export function calculateIncomeTaxNewRegime(taxableIncome: number): { tax: number; cess: number; totalTax: number } {
  // Budget revised slabs (Section 115BAC)
  if (taxableIncome <= 300000) return { tax: 0, cess: 0, totalTax: 0 };

  let tax = 0;
  if (taxableIncome > 1500000) {
    tax += (taxableIncome - 1500000) * 0.30;
    tax += 300000 * 0.20; // 12L to 15L
    tax += 200000 * 0.15; // 10L to 12L
    tax += 300000 * 0.10; // 7L to 10L
    tax += 400000 * 0.05; // 3L to 7L
  } else if (taxableIncome > 1200000) {
    tax += (taxableIncome - 1200000) * 0.20;
    tax += 200000 * 0.15;
    tax += 300000 * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.15;
    tax += 300000 * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 700000) {
    tax += (taxableIncome - 700000) * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 300000) {
    tax += (taxableIncome - 300000) * 0.05;
  }

  // Section 87A rebate for taxable income up to 7 Lakhs
  if (taxableIncome <= 700000) {
    tax = 0;
  }

  const cess = tax * 0.04;
  return {
    tax: Math.round(tax),
    cess: Math.round(cess),
    totalTax: Math.round(tax + cess),
  };
}

export function calculateIncomeTaxOldRegime(taxableIncome: number): { tax: number; cess: number; totalTax: number } {
  if (taxableIncome <= 250000) return { tax: 0, cess: 0, totalTax: 0 };

  let tax = 0;
  if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.30;
    tax += 500000 * 0.20; // 5L to 10L
    tax += 250000 * 0.05; // 2.5L to 5L
  } else if (taxableIncome > 500000) {
    tax += (taxableIncome - 500000) * 0.20;
    tax += 250000 * 0.05;
  } else if (taxableIncome > 250000) {
    tax += (taxableIncome - 250000) * 0.05;
  }

  // Section 87A rebate for old regime up to 5 Lakhs
  if (taxableIncome <= 500000) {
    tax = 0;
  }

  const cess = tax * 0.04;
  return {
    tax: Math.round(tax),
    cess: Math.round(cess),
    totalTax: Math.round(tax + cess),
  };
}

export function calculateCtcPure(input: CtcInput) {
  const { annualCtc, regime, bonusPercent, employerPfIncludedInCtc, customMonthlyDeductions, oldRegimeDeductions } = input;

  // Basic is typically 40% of CTC
  const basicSalary = annualCtc * 0.40;
  
  // EPF: Employee 12% of basic (statutory max ₹1,800/mo if capped at ₹15k, but commonly 12% uncapped or capped)
  // We use standard 12% capped at ₹21,600/yr (₹1,800/mo) or 12% of basic if basic is used
  const employeeAnnualPf = Math.min(basicSalary * 0.12, 12 * 1800);
  const employerAnnualPf = employerPfIncludedInCtc ? employeeAnnualPf : 0;

  // Professional Tax: standard ₹2,400/yr (₹200/mo)
  const professionalTax = 2400;

  // Variable bonus component (paid annually, not monthly)
  const annualBonus = annualCtc * (bonusPercent / 100);

  // Standard deduction
  const standardDeduction = regime === 'new' ? 75000 : 50000;

  // Taxable Income computation
  let taxableIncome = 0;
  if (regime === 'new') {
    taxableIncome = Math.max(0, annualCtc - employerAnnualPf - standardDeduction);
  } else {
    taxableIncome = Math.max(0, annualCtc - employerAnnualPf - standardDeduction - professionalTax - oldRegimeDeductions);
  }

  const taxBreakdown = regime === 'new' 
    ? calculateIncomeTaxNewRegime(taxableIncome)
    : calculateIncomeTaxOldRegime(taxableIncome);

  // Total annual deductions from gross salary
  const totalAnnualDeductions = taxBreakdown.totalTax + employeeAnnualPf + professionalTax + (customMonthlyDeductions * 12);
  
  // Guaranteed monthly in-hand (excluding annual variable bonus)
  const fixedAnnualCtc = annualCtc - annualBonus - employerAnnualPf;
  const annualInHand = Math.max(0, fixedAnnualCtc - totalAnnualDeductions);
  const monthlyInHand = Math.round(annualInHand / 12);

  return {
    monthlyInHand,
    annualInHand: Math.round(annualInHand),
    taxableIncome: Math.round(taxableIncome),
    totalAnnualTax: taxBreakdown.totalTax,
    monthlyTax: Math.round(taxBreakdown.totalTax / 12),
    employeeAnnualPf: Math.round(employeeAnnualPf),
    monthlyPf: Math.round(employeeAnnualPf / 12),
    professionalTaxAnnual: professionalTax,
    professionalTaxMonthly: Math.round(professionalTax / 12),
    annualBonus: Math.round(annualBonus),
    employerAnnualPf: Math.round(employerAnnualPf),
    effectiveTaxRate: (taxBreakdown.totalTax / annualCtc) * 100,
  };
}

export const ctcCalculator: CalculatorDefinition<CtcInput> = {
  id: 'ctc-to-take-home',
  slug: 'ctc-to-take-home',
  name: 'CTC to In-Hand Salary Calculator',
  shortTitle: 'Salary in Hand',
  category: 'money',
  subcategory: 'Salaries',
  description: 'Estimate your exact monthly take-home salary from your Annual CTC after EPF, Professional Tax, and Income Tax (New vs Old Tax Regime).',
  badge: 'India Specific',
  seo: {
    title: 'CTC to In-Hand Salary Calculator India — Monthly Take-Home & Tax Slabs',
    description: 'Calculate your actual monthly take-home in-hand salary from Cost to Company (CTC) under New and Old Tax Regimes with full deductions breakdown.',
    keywords: ['ctc to in hand salary', 'take home salary calculator', 'in hand salary calculator india', 'ctc calculator', 'income tax new regime salary'],
    canonicalPath: '/calculators/money/ctc-to-take-home',
  },
  inputs: [
    {
      id: 'annualCtc',
      label: 'Annual CTC (Cost to Company)',
      type: 'currency',
      defaultValue: 1200000,
      min: 200000,
      max: 10000000,
      step: 50000,
      description: 'Your gross offer letter Cost to Company per annum.',
    },
    {
      id: 'regime',
      label: 'Tax Regime',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New Tax Regime (Section 115BAC — Default)', value: 'new' },
        { label: 'Old Tax Regime (With 80C, 80D, HRA deductions)', value: 'old' },
      ],
      description: 'Choose your applicable financial year income tax regime.',
    },
    {
      id: 'bonusPercent',
      label: 'Variable / Bonus Included in CTC (%)',
      type: 'percentage',
      defaultValue: 10,
      min: 0,
      max: 40,
      step: 1,
      description: 'Performance bonus or annual variable pay not paid monthly.',
    },
    {
      id: 'employerPfIncludedInCtc',
      label: 'Employer EPF part of CTC?',
      type: 'select',
      defaultValue: true,
      options: [
        { label: 'Yes (Standard in most Indian IT & Private firms)', value: true },
        { label: 'No (Over and above CTC)', value: false },
      ],
    },
    {
      id: 'customMonthlyDeductions',
      label: 'Other Monthly Deductions (Insurance/Food Coupons)',
      type: 'currency',
      defaultValue: 0,
      min: 0,
      max: 20000,
      step: 500,
      description: 'Voluntary deductions like company group health insurance, meal cards, etc.',
    },
    {
      id: 'oldRegimeDeductions',
      label: 'Total Old Regime Deductions (80C, 80D, HRA)',
      type: 'currency',
      defaultValue: 150000,
      min: 0,
      max: 1000000,
      step: 10000,
      description: 'Applicable only if Old Tax Regime is selected.',
    },
  ],
  inputSchema: ctcInputSchema,
  calculate: (inputs: CtcInput): CalculatorResult => {
    const res = calculateCtcPure(inputs);

    return {
      primary: {
        id: 'monthlyInHand',
        label: 'Estimated Monthly In-Hand Salary',
        value: res.monthlyInHand,
        formattedValue: formatCurrency(res.monthlyInHand),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'annualInHand',
          label: 'Annual Take-Home (Fixed)',
          value: res.annualInHand,
          formattedValue: formatCurrency(res.annualInHand),
          type: 'currency',
        },
        {
          id: 'monthlyTax',
          label: 'Monthly TDS (Tax)',
          value: res.monthlyTax,
          formattedValue: formatCurrency(res.monthlyTax),
          type: 'currency',
          helpText: `${formatCurrency(res.totalAnnualTax)}/yr total tax`,
        },
        {
          id: 'monthlyPf',
          label: 'Monthly EPF Deduction',
          value: res.monthlyPf,
          formattedValue: formatCurrency(res.monthlyPf),
          type: 'currency',
          helpText: 'Goes into your retirement EPF corpus',
        },
        {
          id: 'effectiveTaxRate',
          label: 'Effective Tax Rate',
          value: res.effectiveTaxRate,
          formattedValue: formatPercentage(res.effectiveTaxRate, 1),
          type: 'percentage',
        },
      ],
      summaryExplanation: `With an Annual CTC of ${formatCurrency(inputs.annualCtc)} under the ${inputs.regime === 'new' ? 'New' : 'Old'} Tax Regime, your estimated monthly in-hand salary is approximately ${formatCurrency(res.monthlyInHand)}. Your total annual income tax is estimated at ${formatCurrency(res.totalAnnualTax)}, with monthly EPF deduction of ${formatCurrency(res.monthlyPf)}.`,
      detailedExplanation: `Cost to Company (CTC) is not take-home pay. It includes employer contributions, statutory deductions, and periodic variable bonuses. Your monthly credit is what remains after statutory Provident Fund (EPF), Professional Tax (PT), and monthly Tax Deducted at Source (TDS).`,
      assumptions: [
        'Standard deduction (₹75,000 in New Regime, ₹50,000 in Old Regime) is applied.',
        'Basic salary is estimated at 40% of CTC for statutory provident fund calculations.',
        'Professional tax is estimated at standard ₹200/month (₹2,400/year).',
        'Variable bonus is assumed to be paid annually or semi-annually and excluded from regular monthly credits.',
      ],
      caveats: [
        'Actual salary slips may vary based on your employer’s specific salary structure (HRA, Special Allowance, LTA).',
        'State-specific professional tax rules differ slightly (e.g., Maharashtra, Karnataka, West Bengal).',
        'This is an estimate for educational planning and does not constitute formal tax filing advice.',
      ],
      breakdownTable: {
        title: 'Annual Salary Components & Deductions',
        columns: [
          { key: 'component', label: 'Salary Component / Deduction', align: 'left' },
          { key: 'annual', label: 'Annual (₹)', align: 'right' },
          { key: 'monthly', label: 'Monthly (₹)', align: 'right' },
        ],
        rows: [
          { component: 'Gross CTC', annual: formatCurrency(inputs.annualCtc), monthly: formatCurrency(Math.round(inputs.annualCtc / 12)) },
          { component: 'Variable Bonus (Yearly)', annual: formatCurrency(res.annualBonus), monthly: 'Paid Annually' },
          { component: 'Income Tax (TDS)', annual: formatCurrency(res.totalAnnualTax), monthly: formatCurrency(res.monthlyTax) },
          { component: 'Employee Provident Fund (EPF)', annual: formatCurrency(res.employeeAnnualPf), monthly: formatCurrency(res.monthlyPf) },
          { component: 'Professional Tax (PT)', annual: formatCurrency(res.professionalTaxAnnual), monthly: formatCurrency(res.professionalTaxMonthly) },
          { component: 'Net Estimated In-Hand Take-Home', annual: formatCurrency(res.annualInHand), monthly: formatCurrency(res.monthlyInHand) },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Where Does Your CTC Go?',
          data: [
            { label: 'Net In-Hand Salary', value: res.annualInHand },
            { label: 'Income Tax (TDS)', value: res.totalAnnualTax },
            { label: 'EPF & Deductions', value: res.employeeAnnualPf + res.professionalTaxAnnual },
            ...(res.annualBonus > 0 ? [{ label: 'Variable Bonus', value: res.annualBonus }] : []),
          ],
        },
      ],
      raw: res,
    };
  },
  examples: [
    {
      title: '₹12 Lakh CTC with 10% Variable in New Regime',
      description: 'Standard mid-level corporate salary package.',
      inputs: { annualCtc: 1200000, regime: 'new', bonusPercent: 10, employerPfIncludedInCtc: true, customMonthlyDeductions: 0, oldRegimeDeductions: 0 },
      expectedPrimary: '₹75,650',
    },
    {
      title: '₹6 Lakh CTC with 0% Variable in New Regime',
      description: 'Zero tax liability due to Section 87A rebate.',
      inputs: { annualCtc: 600000, regime: 'new', bonusPercent: 0, employerPfIncludedInCtc: true, customMonthlyDeductions: 0, oldRegimeDeductions: 0 },
      expectedPrimary: '₹46,200',
    },
  ],
  faq: [
    {
      question: 'Why is my take-home salary less than CTC ÷ 12?',
      answer: 'CTC includes company expenses such as the employer’s share of PF, gratuity, group medical insurance, and performance bonuses. Take-home represents only the net cash deposited to your bank after income tax TDS and employee PF.',
    },
    {
      question: 'Should I choose the New or Old Tax Regime?',
      answer: 'The New Regime provides lower tax slab rates and a higher standard deduction (₹75,000) with zero tax up to ₹7 Lakh taxable income without requiring investment proofs. The Old Regime is usually beneficial only if you claim high deductions like HRA, home loan interest (Sec 24), and Section 80C/80D exceeding ₹3.75 Lakhs.',
    },
  ],
  relatedCalculatorIds: ['emi', 'can-i-afford-this', 'sip'],
  disclaimer: 'Calculations are estimates based on standard Indian income tax slabs and typical corporate compensation structures. Consult a qualified Chartered Accountant for personal tax filings.',
};
