import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatPercentage } from '../../formatters';

export const gstInputSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  gstRate: z.number().min(0).max(100),
  calculationType: z.enum(['exclusive', 'inclusive']), // exclusive = Add GST, inclusive = Remove GST
});

export type GstInput = z.infer<typeof gstInputSchema>;

export function calculateGstPure(amount: number, gstRate: number, type: 'exclusive' | 'inclusive') {
  let netAmount = 0;
  let gstAmount = 0;
  let totalAmount = 0;

  if (type === 'exclusive') {
    // Add GST to net amount
    netAmount = amount;
    gstAmount = (amount * gstRate) / 100;
    totalAmount = netAmount + gstAmount;
  } else {
    // Remove GST from gross amount: Gross = Net * (1 + r/100) => Net = Gross / (1 + r/100)
    totalAmount = amount;
    netAmount = amount / (1 + gstRate / 100);
    gstAmount = totalAmount - netAmount;
  }

  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return {
    netAmount: Math.round(netAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
  };
}

export const gstCalculator: CalculatorDefinition<GstInput> = {
  id: 'gst',
  slug: 'gst',
  name: 'GST Calculator',
  shortTitle: 'GST',
  category: 'money',
  subcategory: 'Everyday Expenses',
  description: 'Add or remove Goods and Services Tax (GST), calculate CGST, SGST, and IGST components across Indian GST slabs (5%, 12%, 18%, 28%).',
  badge: 'Everyday',
  seo: {
    title: 'GST Calculator India — Add or Remove GST, CGST, SGST Breakdown',
    description: 'Calculate GST inclusive and exclusive prices, CGST, SGST and net amount for 5%, 12%, 18% and 28% GST tax rates with LifeCalc.',
    keywords: ['gst calculator', 'gst calculation formula', 'reverse gst calculator', 'cgst sgst calculator', 'indian gst slabs'],
    canonicalPath: '/calculators/money/gst',
  },
  inputs: [
    {
      id: 'amount',
      label: 'Amount (₹)',
      type: 'currency',
      defaultValue: 10000,
      min: 1,
      max: 100000000,
      step: 100,
    },
    {
      id: 'gstRate',
      label: 'GST Slab Rate (%)',
      type: 'select',
      defaultValue: 18,
      options: [
        { label: '5% (Essential goods, transport, economy flights)', value: 5 },
        { label: '12% (Computers, phones, processed food)', value: 12 },
        { label: '18% (IT services, consulting, electronics, hotels)', value: 18 },
        { label: '28% (Luxury goods, automobiles, tobacco, gaming)', value: 28 },
      ],
    },
    {
      id: 'calculationType',
      label: 'Calculation Method',
      type: 'radio',
      defaultValue: 'exclusive',
      options: [
        { label: 'Add GST (Exclusive — Amount does not include GST)', value: 'exclusive' },
        { label: 'Remove GST (Inclusive — Amount already includes GST)', value: 'inclusive' },
      ],
    },
  ],
  inputSchema: gstInputSchema,
  calculate: (inputs: GstInput): CalculatorResult => {
    const res = calculateGstPure(inputs.amount, inputs.gstRate, inputs.calculationType);

    const isExclusive = inputs.calculationType === 'exclusive';

    return {
      primary: {
        id: isExclusive ? 'totalAmount' : 'netAmount',
        label: isExclusive ? 'Total Amount (Incl. GST)' : 'Pre-Tax Net Price (Excl. GST)',
        value: isExclusive ? res.totalAmount : res.netAmount,
        formattedValue: formatCurrency(isExclusive ? res.totalAmount : res.netAmount, { decimals: 2 }),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'gstAmount',
          label: 'Total GST Amount',
          value: res.gstAmount,
          formattedValue: formatCurrency(res.gstAmount, { decimals: 2 }),
          type: 'currency',
        },
        {
          id: 'cgst',
          label: 'CGST (Central GST)',
          value: res.cgst,
          formattedValue: formatCurrency(res.cgst, { decimals: 2 }),
          type: 'currency',
          helpText: `${formatPercentage(inputs.gstRate / 2, 1)} for intrastate supply`,
        },
        {
          id: 'sgst',
          label: 'SGST (State GST)',
          value: res.sgst,
          formattedValue: formatCurrency(res.sgst, { decimals: 2 }),
          type: 'currency',
          helpText: `${formatPercentage(inputs.gstRate / 2, 1)} for intrastate supply`,
        },
      ],
      summaryExplanation: isExclusive
        ? `Adding ${formatPercentage(inputs.gstRate, 1)} GST to a net price of ${formatCurrency(inputs.amount)} results in ${formatCurrency(res.gstAmount, { decimals: 2 })} tax, bringing the final price to ${formatCurrency(res.totalAmount, { decimals: 2 })}.`
        : `A GST-inclusive invoice price of ${formatCurrency(inputs.amount)} at ${formatPercentage(inputs.gstRate, 1)} GST has a base pre-tax value of ${formatCurrency(res.netAmount, { decimals: 2 })} and contains ${formatCurrency(res.gstAmount, { decimals: 2 })} in GST.`,
      breakdownTable: {
        title: 'GST Tax Component Breakdown',
        columns: [
          { key: 'item', label: 'Component', align: 'left' },
          { key: 'rate', label: 'Rate', align: 'center' },
          { key: 'amount', label: 'Amount (₹)', align: 'right' },
        ],
        rows: [
          { item: 'Pre-Tax Net Amount', rate: 'Base', amount: formatCurrency(res.netAmount, { decimals: 2 }) },
          { item: 'Central GST (CGST)', rate: formatPercentage(inputs.gstRate / 2, 1), amount: formatCurrency(res.cgst, { decimals: 2 }) },
          { item: 'State GST (SGST)', rate: formatPercentage(inputs.gstRate / 2, 1), amount: formatCurrency(res.sgst, { decimals: 2 }) },
          { item: 'Final Gross Bill Amount', rate: formatPercentage(inputs.gstRate, 1), amount: formatCurrency(res.totalAmount, { decimals: 2 }) },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: 'Add 18% GST to ₹10,000 service invoice',
      description: 'Standard IT service or freelancing bill.',
      inputs: { amount: 10000, gstRate: 18, calculationType: 'exclusive' },
      expectedPrimary: '₹11,800.00',
    },
    {
      title: 'Extract 18% GST from ₹1,180 retail receipt',
      description: 'Determining the actual base cost before taxes.',
      inputs: { amount: 1180, gstRate: 18, calculationType: 'inclusive' },
      expectedPrimary: '₹1,000.00',
    },
  ],
  faq: [
    {
      question: 'When do I apply CGST + SGST vs IGST?',
      answer: 'When a transaction happens within the same state (intrastate), GST is divided equally into CGST (Central) and SGST (State). When selling to a buyer in another state (interstate), the entire tax is levied as IGST (Integrated GST). The total tax payable remains identical.',
    },
  ],
  relatedCalculatorIds: ['ctc-to-take-home', 'can-i-afford-this'],
};
