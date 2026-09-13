import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatPercentage } from '../../formatters';

export const attendanceInputSchema = z.object({
  presentClasses: z.number().min(0, 'Classes attended cannot be negative'),
  totalClasses: z.number().min(1, 'Total classes must be at least 1'),
  targetPercentage: z.number().min(1).max(100).default(75),
}).refine(data => data.presentClasses <= data.totalClasses, {
  message: 'Attended classes cannot exceed total classes',
  path: ['presentClasses'],
});

export type AttendanceInput = z.infer<typeof attendanceInputSchema>;

export function calculateAttendancePure(present: number, total: number, target: number) {
  if (total <= 0) {
    return {
      currentPercentage: 0,
      isEligible: false,
      classesNeeded: 0,
      canBunk: 0,
      totalClasses: 0,
      presentClasses: 0,
      targetPercentage: target,
    };
  }

  const currentPercentage = (present / total) * 100;
  const isEligible = currentPercentage >= target;

  let classesNeeded = 0;
  let canBunk = 0;

  if (!isEligible) {
    // x = ceil((target * total - 100 * present) / (100 - target))
    if (target === 100) {
      classesNeeded = Infinity; // Cannot achieve 100% if already missed 1 class
    } else {
      classesNeeded = Math.ceil((target * total - 100 * present) / (100 - target));
    }
  } else {
    // y = floor((100 * present - target * total) / target)
    canBunk = Math.floor((100 * present - target * total) / target);
  }

  return {
    currentPercentage: Math.round(currentPercentage * 100) / 100,
    isEligible,
    classesNeeded: classesNeeded === Infinity ? -1 : Math.max(0, classesNeeded),
    canBunk: Math.max(0, canBunk),
    totalClasses: total,
    presentClasses: present,
    targetPercentage: target,
  };
}

export const attendanceCalculator: CalculatorDefinition<AttendanceInput> = {
  id: 'attendance',
  slug: 'attendance',
  name: 'Attendance Calculator',
  shortTitle: 'Attendance',
  category: 'student',
  subcategory: 'College',
  description: 'Find out how many more consecutive classes you need to attend to hit your target (75% or 85%), or how many you can safely bunk without being detained.',
  badge: 'Student Essential',
  seo: {
    title: 'Attendance Calculator — 75% Criteria, Classes to Attend or Bunk',
    description: 'Calculate your current college attendance percentage, find how many classes you must attend to achieve 75%, or how many you can skip safely on LifeCalc.',
    keywords: ['attendance calculator', '75 percent attendance calculator', 'college attendance bunk calculator', 'classes required for 75 percent'],
    canonicalPath: '/calculators/student/attendance',
  },
  inputs: [
    {
      id: 'presentClasses',
      label: 'Classes Attended (Present)',
      type: 'number',
      defaultValue: 38,
      min: 0,
      max: 1000,
      step: 1,
    },
    {
      id: 'totalClasses',
      label: 'Total Classes Held So Far',
      type: 'number',
      defaultValue: 50,
      min: 1,
      max: 1000,
      step: 1,
    },
    {
      id: 'targetPercentage',
      label: 'Target Attendance Requirement (%)',
      type: 'slider',
      defaultValue: 75,
      min: 50,
      max: 95,
      step: 1,
      unit: '%',
      description: 'College or university minimum attendance threshold (usually 75% or 85%).',
    },
  ],
  inputSchema: attendanceInputSchema,
  calculate: (inputs: AttendanceInput): CalculatorResult => {
    const res = calculateAttendancePure(inputs.presentClasses, inputs.totalClasses, inputs.targetPercentage);

    const primaryLabel = res.isEligible ? 'Classes You Can Safely Bunk' : 'Consecutive Classes You Must Attend';
    const primaryValue = res.isEligible ? res.canBunk : res.classesNeeded;

    let explanation = '';
    if (res.isEligible) {
      explanation = `Your current attendance is ${formatPercentage(res.currentPercentage, 1)}, which is safely above your ${inputs.targetPercentage}% goal. You can afford to miss up to ${res.canBunk} more lecture${res.canBunk === 1 ? '' : 's'} without falling below ${inputs.targetPercentage}%.`;
    } else if (res.classesNeeded === -1) {
      explanation = `Your current attendance is ${formatPercentage(res.currentPercentage, 1)}. Since you already missed classes, a 100% attendance mark is mathematically impossible this semester.`;
    } else {
      explanation = `Your current attendance is ${formatPercentage(res.currentPercentage, 1)}, which is below your university's ${inputs.targetPercentage}% threshold. You need to attend the next ${res.classesNeeded} consecutive lecture${res.classesNeeded === 1 ? '' : 's'} without absence to restore your attendance to ${inputs.targetPercentage}%.`;
    }

    return {
      primary: {
        id: 'primaryAction',
        label: primaryLabel,
        value: primaryValue,
        formattedValue: `${primaryValue} class${primaryValue === 1 ? '' : 'es'}`,
        type: 'badge',
        badgeColor: res.isEligible ? 'green' : 'red',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'currentPercentage',
          label: 'Current Attendance',
          value: res.currentPercentage,
          formattedValue: formatPercentage(res.currentPercentage, 1),
          type: 'percentage',
          badgeColor: res.isEligible ? 'green' : 'red',
        },
        {
          id: 'status',
          label: 'Exam Eligibility Status',
          value: res.isEligible ? 'Eligible 🟢' : 'At Risk of Shortage 🔴',
          formattedValue: res.isEligible ? 'Eligible for Exams' : 'Shortage Warning',
          type: 'text',
        },
        {
          id: 'missedClasses',
          label: 'Classes Missed (Absent)',
          value: inputs.totalClasses - inputs.presentClasses,
          formattedValue: `${inputs.totalClasses - inputs.presentClasses} classes`,
          type: 'number',
        },
      ],
      summaryExplanation: explanation,
      detailedExplanation: `University rules typically mandate a minimum 75% attendance for semester exam hall tickets. Attending future classes dilutes the weight of past absences because both your present count and total count increase by 1 each day.`,
      formula: {
        expression: 'Classes to Attend = ⌈(Target × Total - 100 × Present) / (100 - Target)⌉',
        description: 'Equation derived from: (Present + X) / (Total + X) ≥ Target / 100.',
        variables: [
          { name: 'Present', description: 'Number of classes attended so far' },
          { name: 'Total', description: 'Total classes conducted to date' },
          { name: 'Target', description: 'Mandated attendance percentage (e.g. 75%)' },
        ],
      },
      charts: [
        {
          type: 'donut',
          title: 'Current Attendance Distribution',
          data: [
            { label: 'Attended', value: inputs.presentClasses },
            { label: 'Missed', value: inputs.totalClasses - inputs.presentClasses },
          ],
          series: [
            { key: 'Attended', name: 'Present', color: '#10b981' },
            { key: 'Missed', name: 'Absent', color: '#ef4444' },
          ],
        },
      ],
      raw: res,
    };
  },
  examples: [
    {
      title: '38 out of 50 classes attended (Target 75%)',
      description: 'Check if you have safe margin to skip a class.',
      inputs: { presentClasses: 38, totalClasses: 50, targetPercentage: 75 },
      expectedPrimary: '0 classes',
    },
    {
      title: '25 out of 40 classes attended (Target 75%)',
      description: 'Find required lectures to recover shortage.',
      inputs: { presentClasses: 25, totalClasses: 40, targetPercentage: 75 },
      expectedPrimary: '20 classes',
    },
  ],
  faq: [
    {
      question: 'What happens if I miss a class when I am already at 75%?',
      answer: 'Your percentage immediately drops below 75% because the denominator (total classes) increases while the numerator (classes attended) stays constant. You will then need to attend several consecutive classes to recover.',
    },
  ],
  relatedCalculatorIds: ['cgpa', 'age'],
};
