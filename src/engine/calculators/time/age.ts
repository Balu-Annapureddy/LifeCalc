import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatNumber } from '../../formatters';

export const ageInputSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required').default(() => new Date().toISOString().split('T')[0]),
});

export type AgeInput = z.infer<typeof ageInputSchema>;

export function calculateAgePure(birthDateStr: string, targetDateStr: string) {
  const birth = new Date(birthDateStr);
  const target = new Date(targetDateStr);

  if (target < birth) {
    throw new Error('Target date cannot be before birth date');
  }

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    // Days in previous month of target
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  // Total elapsed calculations
  const diffMs = target.getTime() - birth.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = totalDays * 24;

  // Next birthday calculation
  let nextBirthdayYear = target.getFullYear();
  let nextBirthday = new Date(nextBirthdayYear, birth.getMonth(), birth.getDate());
  if (nextBirthday < target) {
    nextBirthdayYear++;
    nextBirthday = new Date(nextBirthdayYear, birth.getMonth(), birth.getDate());
  }

  const daysToNextBirthday = Math.ceil((nextBirthday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    totalHours,
    daysToNextBirthday,
  };
}

export const ageCalculator: CalculatorDefinition<AgeInput> = {
  id: 'age',
  slug: 'age',
  name: 'Age Calculator',
  shortTitle: 'Age',
  category: 'time',
  subcategory: 'Dates',
  description: 'Calculate your exact age in years, months, days, total weeks, and hours, plus countdown to your next birthday.',
  badge: 'Popular',
  seo: {
    title: 'Age Calculator — Exact Age in Years, Months, Days & Next Birthday',
    description: 'Calculate your exact age from date of birth, total days lived, days until next birthday, and time difference between dates on LifeCalc.',
    keywords: ['age calculator', 'calculate age from date of birth', 'exact age calculator', 'how old am i', 'next birthday countdown'],
    canonicalPath: '/calculators/time/age',
  },
  inputs: [
    {
      id: 'birthDate',
      label: 'Date of Birth',
      type: 'date',
      defaultValue: '2000-01-01',
      description: 'Select your birth date.',
    },
    {
      id: 'targetDate',
      label: 'Age As Of Date',
      type: 'date',
      defaultValue: () => new Date().toISOString().split('T')[0],
      description: 'Usually today’s date.',
    },
  ],
  inputSchema: ageInputSchema,
  calculate: (inputs: AgeInput): CalculatorResult => {
    const res = calculateAgePure(inputs.birthDate, inputs.targetDate);

    return {
      primary: {
        id: 'exactAge',
        label: 'Exact Age',
        value: `${res.years} years`,
        formattedValue: `${res.years} Years, ${res.months} Months, ${res.days} Days`,
        type: 'text',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'nextBirthday',
          label: 'Next Birthday In',
          value: res.daysToNextBirthday,
          formattedValue: `${res.daysToNextBirthday} days`,
          type: 'text',
          badgeColor: 'blue',
        },
        {
          id: 'totalDays',
          label: 'Total Days Lived',
          value: res.totalDays,
          formattedValue: `${formatNumber(res.totalDays)} days`,
          type: 'number',
        },
        {
          id: 'totalWeeks',
          label: 'Total Weeks Lived',
          value: res.totalWeeks,
          formattedValue: `${formatNumber(res.totalWeeks)} weeks`,
          type: 'number',
        },
        {
          id: 'totalHours',
          label: 'Total Approximate Hours',
          value: res.totalHours,
          formattedValue: `${formatNumber(res.totalHours)} hours`,
          type: 'number',
        },
      ],
      summaryExplanation: `You are exactly ${res.years} years, ${res.months} months, and ${res.days} days old. You have lived through ${formatNumber(res.totalDays)} days (${formatNumber(res.totalWeeks)} weeks). Your next birthday is in ${res.daysToNextBirthday} days.`,
      raw: res,
    };
  },
  examples: [
    {
      title: 'Born on Jan 1, 2000',
      description: 'Millennium baby age calculation.',
      inputs: { birthDate: '2000-01-01', targetDate: '2026-01-01' },
      expectedPrimary: '26 Years, 0 Months, 0 Days',
    },
  ],
  faq: [
    {
      question: 'How are leap years factored into the age calculation?',
      answer: 'Leap years (February with 29 days) are automatically accounted for through exact calendar day difference arithmetic.',
    },
  ],
  relatedCalculatorIds: ['attendance', 'cgpa'],
};
