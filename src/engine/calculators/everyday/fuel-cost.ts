import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatCurrency, formatNumber } from '../../formatters';

export const fuelInputSchema = z.object({
  distanceKm: z.number().min(0.1, 'Distance must be at least 100 meters').max(100000),
  mileageKmpl: z.number().min(0.5, 'Mileage must be at least 0.5 km/l').max(150),
  fuelPricePerLitre: z.number().min(1, 'Fuel price must be greater than 0').max(500),
  isRoundTrip: z.boolean().default(false),
  passengers: z.number().min(1).max(50).default(1),
});

export type FuelInput = z.infer<typeof fuelInputSchema>;

export function calculateFuelCostPure(
  distanceKm: number,
  mileageKmpl: number,
  fuelPrice: number,
  isRoundTrip: boolean,
  passengers: number
) {
  const effectiveDistance = isRoundTrip ? distanceKm * 2 : distanceKm;
  const fuelLiters = effectiveDistance / mileageKmpl;
  const totalCost = fuelLiters * fuelPrice;
  const costPerKm = totalCost / effectiveDistance;
  const costPerPerson = totalCost / passengers;

  return {
    totalCost: Math.round(totalCost),
    fuelLiters: Math.round(fuelLiters * 100) / 100,
    costPerKm: Math.round(costPerKm * 100) / 100,
    costPerPerson: Math.round(costPerPerson),
    effectiveDistance,
  };
}

export const fuelCalculator: CalculatorDefinition<FuelInput> = {
  id: 'fuel-cost',
  slug: 'fuel-cost',
  name: 'Fuel Cost & Mileage Calculator',
  shortTitle: 'Fuel & Mileage',
  category: 'money',
  subcategory: 'Everyday Expenses',
  description: 'Calculate total fuel cost, litres of petrol or diesel required, cost per kilometre, and carpool split costs for any road trip.',
  badge: 'Everyday',
  seo: {
    title: 'Fuel Cost Calculator — Trip Petrol/Diesel Cost & Carpool Split',
    description: 'Calculate fuel cost for car or bike road trips based on distance, mileage (km/l), petrol/diesel prices, and split costs among travellers with LifeCalc.',
    keywords: ['fuel cost calculator', 'petrol cost calculator', 'trip mileage calculator', 'carpool cost split', 'car travel cost calculator'],
    canonicalPath: '/calculators/money/fuel-cost',
  },
  inputs: [
    {
      id: 'distanceKm',
      label: 'Trip Distance (Kilometres)',
      type: 'number',
      defaultValue: 250,
      min: 1,
      max: 10000,
      step: 5,
      unit: 'km',
      description: 'One-way driving distance.',
    },
    {
      id: 'mileageKmpl',
      label: 'Vehicle Mileage / Fuel Economy (km/L)',
      type: 'number',
      defaultValue: 15,
      min: 2,
      max: 100,
      step: 0.5,
      unit: 'km/l',
      description: 'Typical petrol hatchback ~15 km/l, diesel SUV ~14 km/l, motorcycle ~45 km/l.',
    },
    {
      id: 'fuelPricePerLitre',
      label: 'Fuel Price (₹ per Litre)',
      type: 'currency',
      defaultValue: 102,
      min: 50,
      max: 200,
      step: 1,
      description: 'Current local petrol or diesel price per litre.',
    },
    {
      id: 'isRoundTrip',
      label: 'Is this a Round Trip?',
      type: 'select',
      defaultValue: false,
      options: [
        { label: 'One Way Only', value: false },
        { label: 'Round Trip (Both ways — 2x distance)', value: true },
      ],
    },
    {
      id: 'passengers',
      label: 'Number of Travellers (Carpool Split)',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 20,
      step: 1,
      description: 'Split fuel costs equally among friends or passengers.',
    },
  ],
  inputSchema: fuelInputSchema,
  calculate: (inputs: FuelInput): CalculatorResult => {
    const res = calculateFuelCostPure(
      inputs.distanceKm,
      inputs.mileageKmpl,
      inputs.fuelPricePerLitre,
      inputs.isRoundTrip,
      inputs.passengers
    );

    return {
      primary: {
        id: 'totalCost',
        label: 'Total Estimated Fuel Cost',
        value: res.totalCost,
        formattedValue: formatCurrency(res.totalCost),
        type: 'currency',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'fuelLiters',
          label: 'Fuel Required',
          value: res.fuelLiters,
          formattedValue: `${res.fuelLiters} Litres`,
          type: 'text',
        },
        {
          id: 'costPerKm',
          label: 'Cost per Kilometre',
          value: res.costPerKm,
          formattedValue: `₹${res.costPerKm.toFixed(2)} / km`,
          type: 'text',
        },
        ...(inputs.passengers > 1
          ? [
              {
                id: 'costPerPerson',
                label: `Split per Person (${inputs.passengers} people)`,
                value: res.costPerPerson,
                formattedValue: formatCurrency(res.costPerPerson),
                type: 'currency' as const,
                badgeColor: 'blue' as const,
              },
            ]
          : []),
        {
          id: 'totalDistance',
          label: 'Total Travel Distance',
          value: res.effectiveDistance,
          formattedValue: `${formatNumber(res.effectiveDistance)} km`,
          type: 'number',
        },
      ],
      summaryExplanation: `Driving ${formatNumber(res.effectiveDistance)} km with a mileage of ${inputs.mileageKmpl} km/L will require approximately ${res.fuelLiters} litres of fuel, costing ${formatCurrency(res.totalCost)} at ₹${inputs.fuelPricePerLitre}/L (₹${res.costPerKm.toFixed(2)}/km).${inputs.passengers > 1 ? ` Split equally among ${inputs.passengers} people, each person pays ${formatCurrency(res.costPerPerson)}.` : ''}`,
      raw: res,
    };
  },
  examples: [
    {
      title: '250 km highway trip at 15 km/L (Petrol ₹102/L)',
      description: 'Typical weekend road trip in a petrol sedan.',
      inputs: { distanceKm: 250, mileageKmpl: 15, fuelPricePerLitre: 102, isRoundTrip: false, passengers: 1 },
      expectedPrimary: '₹1,700',
    },
    {
      title: 'Bangalore to Goa (600 km round trip, 4 friends)',
      description: 'Carpool cost sharing calculation.',
      inputs: { distanceKm: 600, mileageKmpl: 16, fuelPricePerLitre: 100, isRoundTrip: true, passengers: 4 },
      expectedPrimary: '₹7,500',
    },
  ],
  faq: [
    {
      question: 'Does this include toll charges and vehicle maintenance?',
      answer: 'No, this calculates pure fuel consumption. For total road trip budgeting, remember to add national highway FASTag toll fees and parking costs.',
    },
  ],
  relatedCalculatorIds: ['can-i-afford-this', 'emi'],
};
