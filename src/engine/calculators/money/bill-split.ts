import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency } from '../../formatters';

export const billSplitInputSchema = z.object({
  totalBill: z.number().min(1, 'Bill amount must be at least ₹1').max(10000000, 'Bill amount too large'),
  numPeople: z.number().int().min(1, 'At least 1 person').max(100, 'Maximum 100 people'),
  tipPercentage: z.number().min(0, 'Tip cannot be negative').max(100, 'Tip cannot exceed 100%').default(0),
  taxOrCharges: z.number().min(0, 'Charges cannot be negative').max(1000000).default(0),
});

export type BillSplitInput = z.infer<typeof billSplitInputSchema>;

export function calculateBillSplitPure(
  totalBill: number,
  numPeople: number,
  tipPercentage: number = 0,
  taxOrCharges: number = 0
) {
  const tipAmount = (totalBill * tipPercentage) / 100;
  const grandTotal = totalBill + tipAmount + taxOrCharges;
  const perPerson = grandTotal / numPeople;
  const perPersonBase = totalBill / numPeople;
  const perPersonTip = tipAmount / numPeople;

  return {
    grandTotal: Math.round(grandTotal * 100) / 100,
    perPerson: Math.round(perPerson * 100) / 100,
    tipAmount: Math.round(tipAmount * 100) / 100,
    perPersonBase: Math.round(perPersonBase * 100) / 100,
    perPersonTip: Math.round(perPersonTip * 100) / 100,
    totalBill,
    numPeople,
  };
}

export const billSplitCalculator: CalculatorDefinition<BillSplitInput> = {
  id: 'bill-split',
  slug: 'bill-split',
  name: 'Bill Split & Tip Calculator',
  shortTitle: 'Bill Split & Tip',
  category: 'money',
  subcategory: 'Everyday Expenses',
  description: 'Split restaurant bills, group expenses, food orders, and calculate per-person shares with customizable tip and service charges.',
  badge: 'Everyday',
  seo: {
    title: 'Bill Split & Tip Calculator — Split Group Dining & Expenses Evenly',
    description: 'Quickly divide restaurant bills, group travel meals, and food orders with custom tip and service charges on LifeCalc.',
    keywords: ['bill split calculator', 'tip calculator india', 'group expense splitter', 'restaurant bill split', 'divide bill with tip'],
    canonicalPath: '/calculators/money/bill-split',
  },
  inputs: [
    {
      id: 'totalBill',
      label: 'Total Bill Amount (₹)',
      type: 'currency',
      defaultValue: 2400,
      min: 10,
      max: 1000000,
      step: 50,
      required: true,
      description: 'The food, drinks, or group expense total before tip.',
    },
    {
      id: 'numPeople',
      label: 'Number of People',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 50,
      step: 1,
      required: true,
      description: 'Total people sharing this bill equally.',
    },
    {
      id: 'tipPercentage',
      label: 'Tip Percentage (%)',
      type: 'select',
      defaultValue: 10,
      options: [
        { label: 'No Tip (0%)', value: 0 },
        { label: '5% (Standard Service)', value: 5 },
        { label: '10% (Good Service)', value: 10 },
        { label: '15% (Great Service)', value: 15 },
        { label: '20% (Exceptional)', value: 20 },
      ],
      description: 'Optional tip percentage to add to the bill.',
    },
    {
      id: 'taxOrCharges',
      label: 'Service Charge / Delivery Fee (₹)',
      type: 'currency',
      defaultValue: 0,
      min: 0,
      max: 100000,
      step: 10,
      description: 'Any extra charges, packaging, or delivery fees.',
    },
  ],
  inputSchema: billSplitInputSchema,
  calculate: (inputs: BillSplitInput): CalculatorResult => {
    const res = calculateBillSplitPure(
      inputs.totalBill,
      inputs.numPeople,
      inputs.tipPercentage,
      inputs.taxOrCharges
    );

    return {
      primary: {
        id: 'perPerson',
        label: 'Each Person Pays',
        value: res.perPerson,
        formattedValue: formatCurrency(res.perPerson),
        type: 'currency',
        isPrimary: true,
        helpText: `Total ₹${res.grandTotal.toLocaleString('en-IN')} divided among ${inputs.numPeople} people.`,
      },
      secondary: [
        {
          id: 'grandTotal',
          label: 'Grand Total Bill',
          value: res.grandTotal,
          formattedValue: formatCurrency(res.grandTotal),
          type: 'currency',
          helpText: 'Bill + tip + additional charges.',
        },
        {
          id: 'tipAmount',
          label: 'Total Tip Added',
          value: res.tipAmount,
          formattedValue: formatCurrency(res.tipAmount),
          type: 'currency',
          helpText: `${inputs.tipPercentage}% tip on ₹${inputs.totalBill.toLocaleString('en-IN')}`,
        },
        {
          id: 'perPersonTip',
          label: 'Tip Share per Person',
          value: res.perPersonTip,
          formattedValue: formatCurrency(res.perPersonTip),
          type: 'currency',
        },
      ],
      summaryExplanation: `Each of the ${inputs.numPeople} people pays ${formatCurrency(res.perPerson)} for a grand total of ${formatCurrency(res.grandTotal)}${res.tipAmount > 0 ? ` (including ${formatCurrency(res.tipAmount)} total tip)` : ''}.`,
      detailedExplanation: `The base bill of ${formatCurrency(inputs.totalBill)} was split across ${inputs.numPeople} people (${formatCurrency(res.perPersonBase)} each). With ${inputs.tipPercentage}% tip (${formatCurrency(res.tipAmount)}) and ${formatCurrency(inputs.taxOrCharges)} extra charges, the per-person contribution comes out to exactly ${formatCurrency(res.perPerson)}.`,
      formula: {
        expression: 'Per Person = (Total Bill + Tip + Extra Charges) ÷ Number of People',
        description: 'Computes each individual equal share of a shared bill including optional tip and charges.',
        variables: [
          { name: 'Total Bill', description: 'Base expense or meal cost' },
          { name: 'Tip Amount', description: 'Bill × (Tip % ÷ 100)' },
          { name: 'Number of People', description: 'Total headcount sharing the bill' },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Bill Share Composition',
          data: [
            { label: 'Base Bill', value: Math.round(inputs.totalBill) },
            { label: 'Tip', value: Math.round(res.tipAmount) },
            { label: 'Charges', value: Math.round(inputs.taxOrCharges) },
          ].filter(d => d.value > 0),
        },
      ],
      breakdownTable: {
        title: 'Per-Person Breakdown',
        columns: [
          { key: 'item', label: 'Component', align: 'left' },
          { key: 'total', label: 'Group Total', align: 'right' },
          { key: 'individual', label: 'Per Person', align: 'right' },
        ],
        rows: [
          {
            item: 'Base Food & Beverage',
            total: formatCurrency(inputs.totalBill),
            individual: formatCurrency(res.perPersonBase),
          },
          {
            item: `Tip (${inputs.tipPercentage}%)`,
            total: formatCurrency(res.tipAmount),
            individual: formatCurrency(res.perPersonTip),
          },
          {
            item: 'Service / Other Charges',
            total: formatCurrency(inputs.taxOrCharges),
            individual: formatCurrency(Math.round((inputs.taxOrCharges / inputs.numPeople) * 100) / 100),
          },
          {
            item: 'Total Individual Share',
            total: formatCurrency(res.grandTotal),
            individual: formatCurrency(res.perPerson),
          },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: 'Casual Dinner with 4 Friends',
      description: '₹2,400 bill at a cafe with 10% tip split among 4 friends.',
      inputs: { totalBill: 2400, numPeople: 4, tipPercentage: 10, taxOrCharges: 0 },
      expectedPrimary: '₹660',
    },
    {
      title: 'Weekend Brunch with 6 People',
      description: '₹4,500 total bill with no tip split among 6 people.',
      inputs: { totalBill: 4500, numPeople: 6, tipPercentage: 0, taxOrCharges: 0 },
      expectedPrimary: '₹750',
    },
  ],
  faq: [
    {
      question: 'Is tipping mandatory in Indian restaurants?',
      answer: 'Tipping is discretionary in India. Many restaurants add a 5% to 10% discretionary service charge directly to the food bill. If service charge is already included, an additional tip is optional.',
    },
    {
      question: 'Can I use this for hotel rooms or road trip expenses?',
      answer: 'Yes! Simply enter the total accommodation or travel expense into the total bill field, enter the number of guests/travelers, and leave tip at 0% to get an exact per-person share.',
    },
  ],
  relatedCalculatorIds: ['gst', 'fuel-cost', 'emi'],
};
