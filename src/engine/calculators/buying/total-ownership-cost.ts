import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatIndianWords, formatPercentage } from '../../formatters';
import { calculateEmiPure } from '../money/emi';

export const ownershipCostInputSchema = z.object({
  vehiclePrice: z.number().min(50000, 'Minimum price is ₹50,000').max(50000000),
  ownershipYears: z.number().min(1).max(15).default(5),
  downPayment: z.number().min(0).default(200000),
  loanInterestRate: z.number().min(0).max(30).default(9),
  loanTenureYears: z.number().min(1).max(7).default(5),
  monthlyRunningKm: z.number().min(50).max(10000).default(1000),
  mileageKmpl: z.number().min(5).max(100).default(15),
  fuelPricePerLitre: z.number().min(50).max(200).default(102),
  annualInsurance: z.number().min(1000).max(200000).default(25000),
  annualMaintenance: z.number().min(1000).max(200000).default(15000),
  expectedResalePercent: z.number().min(0).max(100).default(45), // Resale value at end of tenure
});

export type OwnershipCostInput = z.infer<typeof ownershipCostInputSchema>;

export function calculateOwnershipCostPure(input: OwnershipCostInput) {
  const {
    vehiclePrice,
    ownershipYears,
    downPayment,
    loanInterestRate,
    loanTenureYears,
    monthlyRunningKm,
    mileageKmpl,
    fuelPricePerLitre,
    annualInsurance,
    annualMaintenance,
    expectedResalePercent,
  } = input;

  // 1. Financing cost
  const actualDownPayment = Math.min(downPayment, vehiclePrice);
  const loanAmount = Math.max(0, vehiclePrice - actualDownPayment);
  const emiRes = calculateEmiPure(loanAmount, loanInterestRate, Math.min(loanTenureYears, ownershipYears));
  const totalFinancingPaid = actualDownPayment + emiRes.totalPayment;
  const totalLoanInterest = emiRes.totalInterest;

  // 2. Fuel cost
  const totalKmDriven = monthlyRunningKm * 12 * ownershipYears;
  const totalFuelLitres = totalKmDriven / mileageKmpl;
  const totalFuelCost = totalFuelLitres * fuelPricePerLitre;

  // 3. Insurance & Maintenance
  const totalInsuranceCost = annualInsurance * ownershipYears;
  const totalMaintenanceCost = annualMaintenance * ownershipYears;

  // 4. Gross Total Outflow
  const grossTotalOutflow = totalFinancingPaid + totalFuelCost + totalInsuranceCost + totalMaintenanceCost;

  // 5. Depreciation & Resale Recovery
  const estimatedResaleValue = vehiclePrice * (expectedResalePercent / 100);
  const netTotalOwnershipCost = grossTotalOutflow - estimatedResaleValue;

  // Monthly & Per-KM effective cost
  const totalMonths = ownershipYears * 12;
  const effectiveCostPerMonth = netTotalOwnershipCost / totalMonths;
  const effectiveCostPerKm = netTotalOwnershipCost / totalKmDriven;

  return {
    netTotalOwnershipCost: Math.round(netTotalOwnershipCost),
    grossTotalOutflow: Math.round(grossTotalOutflow),
    estimatedResaleValue: Math.round(estimatedResaleValue),
    effectiveCostPerMonth: Math.round(effectiveCostPerMonth),
    effectiveCostPerKm: Math.round(effectiveCostPerKm * 100) / 100,
    totalFuelCost: Math.round(totalFuelCost),
    totalInsuranceCost: Math.round(totalInsuranceCost),
    totalMaintenanceCost: Math.round(totalMaintenanceCost),
    totalLoanInterest: Math.round(totalLoanInterest),
    monthlyEmi: emiRes.emi,
    totalKmDriven,
  };
}

export const totalOwnershipCostCalculator: CalculatorDefinition<OwnershipCostInput> = {
  id: 'total-ownership-cost',
  slug: 'total-ownership-cost',
  name: 'Vehicle Total Ownership Cost Calculator',
  shortTitle: 'Ownership Cost',
  category: 'buying',
  subcategory: 'Vehicles',
  description: 'Calculate the true multi-year cost of owning a car or bike, including loan interest, fuel, annual insurance, periodic servicing, and depreciation.',
  badge: 'Deep Analysis',
  seo: {
    title: 'Vehicle Total Ownership Cost Calculator — True Monthly Cost of Car/Bike',
    description: 'Calculate the true all-inclusive cost of owning a car or motorcycle over 5 to 10 years including fuel, insurance, EMI interest, and resale recovery on LifeCalc.',
    keywords: ['car total ownership cost', 'cost to own a car in india', 'bike ownership cost calculator', 'true monthly car cost'],
    canonicalPath: '/calculators/buying/total-ownership-cost',
  },
  inputs: [
    {
      id: 'vehiclePrice',
      label: 'On-Road Vehicle Price (₹)',
      type: 'currency',
      defaultValue: 1200000,
      min: 50000,
      max: 20000000,
      step: 25000,
    },
    {
      id: 'ownershipYears',
      label: 'Planned Ownership Duration (Years)',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 10,
      step: 1,
      unit: 'years',
    },
    {
      id: 'downPayment',
      label: 'Down Payment Paid (₹)',
      type: 'currency',
      defaultValue: 300000,
      min: 0,
      max: 10000000,
      step: 25000,
    },
    {
      id: 'loanInterestRate',
      label: 'Car Loan Interest Rate (%)',
      type: 'percentage',
      defaultValue: 9,
      min: 0,
      max: 25,
      step: 0.5,
    },
    {
      id: 'loanTenureYears',
      label: 'Loan Duration (Years)',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 7,
      step: 1,
      unit: 'years',
    },
    {
      id: 'monthlyRunningKm',
      label: 'Monthly Driving Distance (km)',
      type: 'number',
      defaultValue: 1000,
      min: 100,
      max: 5000,
      step: 50,
      unit: 'km/mo',
    },
    {
      id: 'mileageKmpl',
      label: 'Fuel Mileage (km/L)',
      type: 'number',
      defaultValue: 15,
      min: 6,
      max: 80,
      step: 0.5,
      unit: 'km/l',
    },
    {
      id: 'fuelPricePerLitre',
      label: 'Fuel Price (₹ / Litre)',
      type: 'currency',
      defaultValue: 102,
      min: 60,
      max: 200,
      step: 1,
    },
    {
      id: 'annualInsurance',
      label: 'Annual Comprehensive Insurance (₹)',
      type: 'currency',
      defaultValue: 25000,
      min: 2000,
      max: 100000,
      step: 1000,
    },
    {
      id: 'annualMaintenance',
      label: 'Annual Maintenance & Tyres (₹)',
      type: 'currency',
      defaultValue: 15000,
      min: 1000,
      max: 100000,
      step: 1000,
    },
    {
      id: 'expectedResalePercent',
      label: 'Estimated Resale Value at End (%)',
      type: 'percentage',
      defaultValue: 45,
      min: 10,
      max: 80,
      step: 5,
      description: 'Typical 5-year old Indian car retains roughly 40%–50% of original value.',
    },
  ],
  inputSchema: ownershipCostInputSchema,
  calculate: (inputs: OwnershipCostInput): CalculatorResult => {
    const res = calculateOwnershipCostPure(inputs);

    return {
      primary: {
        id: 'costPerMonth',
        label: 'True Cost per Month of Ownership',
        value: res.effectiveCostPerMonth,
        formattedValue: formatCurrency(res.effectiveCostPerMonth),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'netTotalCost',
          label: `Net ${inputs.ownershipYears}-Year Cost (After Resale)`,
          value: res.netTotalOwnershipCost,
          formattedValue: formatCurrency(res.netTotalOwnershipCost),
          type: 'currency',
        },
        {
          id: 'costPerKm',
          label: 'Effective Cost per Kilometre',
          value: res.effectiveCostPerKm,
          formattedValue: `₹${res.effectiveCostPerKm.toFixed(2)} / km`,
          type: 'text',
        },
        {
          id: 'resaleValue',
          label: 'Estimated Resale Recovery',
          value: res.estimatedResaleValue,
          formattedValue: formatCurrency(res.estimatedResaleValue),
          type: 'currency',
        },
        {
          id: 'totalFuel',
          label: 'Total Fuel Outflow',
          value: res.totalFuelCost,
          formattedValue: formatCurrency(res.totalFuelCost),
          type: 'currency',
        },
      ],
      summaryExplanation: `Owning this vehicle over ${inputs.ownershipYears} years (${res.totalKmDriven.toLocaleString('en-IN')} km driven) will cost a net total of ${formatIndianWords(res.netTotalOwnershipCost)} (approx. ${formatCurrency(res.effectiveCostPerMonth)}/month or ₹${res.effectiveCostPerKm.toFixed(2)}/km) after accounting for loan interest, insurance, fuel, servicing, and recovering ${formatCurrency(res.estimatedResaleValue)} upon resale.`,
      charts: [
        {
          type: 'donut',
          title: 'Lifetime Outflow Breakdown',
          data: [
            { label: 'Purchase & EMI Interest', value: inputs.vehiclePrice + res.totalLoanInterest },
            { label: 'Fuel Outflow', value: res.totalFuelCost },
            { label: 'Insurance & Maintenance', value: res.totalInsuranceCost + res.totalMaintenanceCost },
          ],
        },
      ],
      breakdownTable: {
        title: 'Complete Ownership Expense Breakdown',
        columns: [
          { key: 'category', label: 'Cost Category', align: 'left' },
          { key: 'amount', label: 'Total Amount (₹)', align: 'right' },
          { key: 'monthly', label: 'Per Month (₹)', align: 'right' },
        ],
        rows: [
          { category: 'On-Road Vehicle Price', amount: formatCurrency(inputs.vehiclePrice), monthly: formatCurrency(Math.round(inputs.vehiclePrice / (inputs.ownershipYears * 12))) },
          { category: 'Loan Financing Interest', amount: formatCurrency(res.totalLoanInterest), monthly: formatCurrency(Math.round(res.totalLoanInterest / (inputs.ownershipYears * 12))) },
          { category: 'Fuel / Energy Consumed', amount: formatCurrency(res.totalFuelCost), monthly: formatCurrency(Math.round(res.totalFuelCost / (inputs.ownershipYears * 12))) },
          { category: 'Comprehensive Insurance', amount: formatCurrency(res.totalInsuranceCost), monthly: formatCurrency(Math.round(res.totalInsuranceCost / (inputs.ownershipYears * 12))) },
          { category: 'Periodic Servicing & Tyres', amount: formatCurrency(res.totalMaintenanceCost), monthly: formatCurrency(Math.round(res.totalMaintenanceCost / (inputs.ownershipYears * 12))) },
          { category: 'Less: Estimated Resale Value Recovered', amount: `-${formatCurrency(res.estimatedResaleValue)}`, monthly: `-${formatCurrency(Math.round(res.estimatedResaleValue / (inputs.ownershipYears * 12)))}` },
          { category: 'Net True Cost of Ownership', amount: formatCurrency(res.netTotalOwnershipCost), monthly: formatCurrency(res.effectiveCostPerMonth) },
        ],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '₹12 Lakh Car over 5 years (1,000 km/month)',
      description: 'Standard petrol hatchback/compact SUV ownership calculation.',
      inputs: {
        vehiclePrice: 1200000,
        ownershipYears: 5,
        downPayment: 300000,
        loanInterestRate: 9,
        loanTenureYears: 5,
        monthlyRunningKm: 1000,
        mileageKmpl: 15,
        fuelPricePerLitre: 102,
        annualInsurance: 25000,
        annualMaintenance: 15000,
        expectedResalePercent: 45,
      },
      expectedPrimary: '₹22,963',
    },
  ],
  faq: [
    {
      question: 'Why is the true cost of a car much higher than the EMI?',
      answer: 'Vehicle owners frequently underestimate recurring non-EMI commitments: annual comprehensive insurance renewals, periodic 10,000 km services, brake and tyre replacements, and cumulative fuel consumption over 5 to 7 years.',
    },
  ],
  relatedCalculatorIds: ['can-i-afford-this', 'fuel-cost', 'emi'],
};
