import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatPercentage } from '../../formatters';

export const discountInputSchema = z.object({
  originalPrice: z.number().min(1, 'Original price must be at least ₹1').max(100000000, 'Price too large'),
  discountPercentage: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
  additionalDiscount: z.number().min(0).max(100).default(0),
  taxPercentage: z.number().min(0).max(50).default(0),
});

export type DiscountInput = z.infer<typeof discountInputSchema>;

export function calculateDiscountPure(
  originalPrice: number,
  discountPercentage: number,
  additionalDiscount: number = 0,
  taxPercentage: number = 0
) {
  const firstDiscountAmount = (originalPrice * discountPercentage) / 100;
  const priceAfterFirst = originalPrice - firstDiscountAmount;
  const secondDiscountAmount = (priceAfterFirst * additionalDiscount) / 100;
  const discountedPrice = priceAfterFirst - secondDiscountAmount;
  const totalSaved = originalPrice - discountedPrice;
  const taxAmount = (discountedPrice * taxPercentage) / 100;
  const finalPrice = discountedPrice + taxAmount;
  const effectiveDiscountPercentage = originalPrice > 0 ? (totalSaved / originalPrice) * 100 : 0;

  return {
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountedPrice: Math.round(discountedPrice * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    effectiveDiscountPercentage: Number(effectiveDiscountPercentage.toFixed(2)),
    originalPrice,
  };
}

export const discountCalculator: CalculatorDefinition<DiscountInput> = {
  id: 'discount',
  slug: 'discount',
  name: 'Discount & Savings Calculator',
  shortTitle: 'Discount & Sale',
  category: 'money',
  subcategory: 'Everyday Expenses',
  description: 'Calculate sale prices, flat discounts, stacked coupon codes, and total money saved on shopping and retail purchases.',
  badge: 'Shopping',
  seo: {
    title: 'Discount Calculator — Sale Price, Stacked Coupons & Money Saved',
    description: 'Quickly find the discounted price, total rupees saved, and combined percentage off for any retail sale, coupon code, or seasonal offer on LifeCalc.',
    keywords: ['discount calculator', 'sale price calculator', 'percentage off calculator', 'coupon discount calculator', 'shopping savings calculator'],
    canonicalPath: '/calculators/money/discount',
  },
  inputs: [
    {
      id: 'originalPrice',
      label: 'Original Price / MRP (₹)',
      type: 'currency',
      defaultValue: 3500,
      min: 10,
      max: 10000000,
      step: 100,
      required: true,
      description: 'The sticker price or MRP before any discounts.',
    },
    {
      id: 'discountPercentage',
      label: 'Primary Discount (%)',
      type: 'percentage',
      defaultValue: 30,
      min: 0,
      max: 100,
      step: 1,
      required: true,
      description: 'The advertised sale discount (e.g., 30% off).',
    },
    {
      id: 'additionalDiscount',
      label: 'Extra Coupon / Member Discount (%)',
      type: 'percentage',
      defaultValue: 10,
      min: 0,
      max: 100,
      step: 1,
      description: 'Optional stacked promo code, credit card discount, or store coupon.',
    },
    {
      id: 'taxPercentage',
      label: 'Sales Tax / GST (%)',
      type: 'percentage',
      defaultValue: 0,
      min: 0,
      max: 28,
      step: 1,
      description: 'Applicable tax rate if not included in the discounted price.',
    },
  ],
  inputSchema: discountInputSchema,
  calculate: (inputs: DiscountInput): CalculatorResult => {
    const res = calculateDiscountPure(
      inputs.originalPrice,
      inputs.discountPercentage,
      inputs.additionalDiscount,
      inputs.taxPercentage
    );

    return {
      primary: {
        id: 'finalPrice',
        label: 'Final Price to Pay',
        value: res.finalPrice,
        formattedValue: formatCurrency(res.finalPrice),
        type: 'currency',
        isPrimary: true,
        helpText: `You save ${formatCurrency(res.totalSaved)} off the ₹${inputs.originalPrice.toLocaleString('en-IN')} MRP.`,
      },
      secondary: [
        {
          id: 'totalSaved',
          label: 'Total Money Saved',
          value: res.totalSaved,
          formattedValue: formatCurrency(res.totalSaved),
          type: 'currency',
          badgeColor: 'green',
        },
        {
          id: 'effectiveDiscount',
          label: 'Combined Discount',
          value: res.effectiveDiscountPercentage,
          formattedValue: formatPercentage(res.effectiveDiscountPercentage),
          type: 'percentage',
        },
        {
          id: 'originalPrice',
          label: 'Original MRP',
          value: res.originalPrice,
          formattedValue: formatCurrency(res.originalPrice),
          type: 'currency',
        },
      ],
      summaryExplanation: `You pay ${formatCurrency(res.finalPrice)} instead of ${formatCurrency(inputs.originalPrice)}, saving ${formatCurrency(res.totalSaved)} (${res.effectiveDiscountPercentage}% effective discount).`,
      detailedExplanation: `On an original price of ${formatCurrency(inputs.originalPrice)}, the primary ${inputs.discountPercentage}% discount reduces the price to ${formatCurrency(inputs.originalPrice * (1 - inputs.discountPercentage / 100))}. Applying the secondary ${inputs.additionalDiscount}% discount brings the price to ${formatCurrency(res.discountedPrice)}${inputs.taxPercentage > 0 ? ` plus ${formatCurrency(res.taxAmount)} tax` : ''}, resulting in a final payable amount of ${formatCurrency(res.finalPrice)}.`,
      formula: {
        expression: 'Final Price = [Price × (1 - Discount₁ %)] × (1 - Discount₂ %) + Tax',
        description: 'Calculates the sequential compounding reduction of stacked retail discounts.',
        variables: [
          { name: 'Price', description: 'Original item retail price' },
          { name: 'Discount₁', description: 'Primary store sale discount' },
          { name: 'Discount₂', description: 'Secondary voucher or promo discount' },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Price vs Savings Breakdown',
          data: [
            { label: 'You Pay', value: Math.round(res.finalPrice) },
            { label: 'You Save', value: Math.round(res.totalSaved) },
          ],
        },
      ],
      breakdownTable: {
        title: 'Discount Breakdown',
        columns: [
          { key: 'stage', label: 'Pricing Stage', align: 'left' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'change', label: 'Impact', align: 'right' },
        ],
        rows: [
          {
            stage: 'Original MRP',
            amount: formatCurrency(inputs.originalPrice),
            change: 'Baseline',
          },
          {
            stage: `Primary Discount (-${inputs.discountPercentage}%)`,
            amount: formatCurrency(inputs.originalPrice * (1 - inputs.discountPercentage / 100)),
            change: `-${formatCurrency((inputs.originalPrice * inputs.discountPercentage) / 100)}`,
          },
          ...(inputs.additionalDiscount > 0
            ? [
                {
                  stage: `Stacked Coupon (-${inputs.additionalDiscount}%)`,
                  amount: formatCurrency(res.discountedPrice),
                  change: `-${formatCurrency(inputs.originalPrice * (1 - inputs.discountPercentage / 100) - res.discountedPrice)}`,
                },
              ]
            : []),
          ...(inputs.taxPercentage > 0
            ? [
                {
                  stage: `Tax / GST (+${inputs.taxPercentage}%)`,
                  amount: formatCurrency(res.finalPrice),
                  change: `+${formatCurrency(res.taxAmount)}`,
                },
              ]
            : []),
          {
            stage: 'Final Amount Due',
            amount: formatCurrency(res.finalPrice),
            change: `Saved ${formatCurrency(res.totalSaved)}`,
          },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: 'Festival Sale with Card Offer',
      description: '₹3,500 clothes with 30% sale discount and extra 10% card discount.',
      inputs: { originalPrice: 3500, discountPercentage: 30, additionalDiscount: 10, taxPercentage: 0 },
      expectedPrimary: '₹2,205',
    },
    {
      title: 'Flat 50% End of Season Sale',
      description: '₹10,000 electronics with flat 50% discount.',
      inputs: { originalPrice: 10000, discountPercentage: 50, additionalDiscount: 0, taxPercentage: 0 },
      expectedPrimary: '₹5,000',
    },
  ],
  faq: [
    {
      question: 'Why is 30% off plus 10% off not equal to 40% off?',
      answer: 'Discounts in retail are applied sequentially. The 30% is taken from the original price, and then the extra 10% coupon is applied to the already reduced price, not the original MRP. On ₹1,000, 30% off makes it ₹700, and 10% off ₹700 makes it ₹630 (total 37% off, not 40%).',
    },
    {
      question: 'How do stacked discounts work on e-commerce platforms?',
      answer: 'Amazon, Flipkart, and Myntra apply category sale discounts first, followed by brand bank coupon codes or payment gateway cashback on the remaining cart total.',
    },
  ],
  relatedCalculatorIds: ['gst', 'bill-split', 'can-i-afford-this'],
};
