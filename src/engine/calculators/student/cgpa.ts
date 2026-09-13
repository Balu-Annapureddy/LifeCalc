import { z } from 'zod';
import { CalculatorDefinition, CalculatorResult } from '../../types';
import { formatPercentage } from '../../formatters';

export const cgpaInputSchema = z.object({
  cgpa: z.number().min(0, 'CGPA cannot be negative').max(10, 'Maximum CGPA is 10.0 on a 10-point scale'),
  universityFormula: z.enum(['cbse', 'standard', 'vtu', 'mumbai', 'ktu']),
});

export type CgpaInput = z.infer<typeof cgpaInputSchema>;

export function calculateCgpaPure(cgpa: number, formula: 'cbse' | 'standard' | 'vtu' | 'mumbai' | 'ktu') {
  let percentage = 0;
  let formulaUsed = '';

  switch (formula) {
    case 'cbse':
      percentage = cgpa * 9.5;
      formulaUsed = 'Percentage = CGPA × 9.5 (CBSE standard rule)';
      break;
    case 'standard':
      percentage = cgpa * 10.0;
      formulaUsed = 'Percentage = CGPA × 10 (Direct linear scaling)';
      break;
    case 'vtu':
      percentage = cgpa >= 0.75 ? (cgpa - 0.75) * 10 : 0;
      formulaUsed = 'Percentage = (CGPA - 0.75) × 10 (VTU Belagavi formula)';
      break;
    case 'mumbai':
      if (cgpa >= 7.0) {
        percentage = 7.1 * cgpa + 12;
      } else {
        percentage = 7.25 * cgpa + 11;
      }
      formulaUsed = 'Percentage = 7.1 × CGPA + 12 (Mumbai University Engineering)';
      break;
    case 'ktu':
      percentage = Math.max(0, cgpa * 10 - 3.75);
      formulaUsed = 'Percentage = 10 × CGPA - 3.75 (APJ Abdul Kalam Technological University)';
      break;
  }

  percentage = Math.min(100, Math.max(0, percentage));

  // Determine academic division
  let division = 'Pass Class';
  let badgeColor: 'green' | 'yellow' | 'red' | 'blue' = 'blue';

  if (percentage >= 75) {
    division = 'First Class with Distinction (Honours)';
    badgeColor = 'green';
  } else if (percentage >= 60) {
    division = 'First Class';
    badgeColor = 'blue';
  } else if (percentage >= 50) {
    division = 'Second Class';
    badgeColor = 'yellow';
  } else if (percentage < 40) {
    division = 'Below Passing Threshold';
    badgeColor = 'red';
  }

  return {
    percentage: Math.round(percentage * 100) / 100,
    division,
    badgeColor,
    formulaUsed,
    cgpa,
  };
}

export const cgpaCalculator: CalculatorDefinition<CgpaInput> = {
  id: 'cgpa',
  slug: 'cgpa',
  name: 'CGPA to Percentage Calculator',
  shortTitle: 'CGPA to %',
  category: 'student',
  subcategory: 'Grading',
  description: 'Convert your 10-point CGPA or SGPA into percentage using official conversion rules for CBSE, VTU, Mumbai University, KTU, or general grading scales.',
  badge: 'Top Tool',
  seo: {
    title: 'CGPA to Percentage Calculator — CBSE, VTU, Mumbai University & KTU',
    description: 'Convert 10-point scale CGPA to equivalent percentage marks using official university conversion formulas and check your academic division.',
    keywords: ['cgpa to percentage', 'cgpa to percentage calculator', 'vtu cgpa to percentage', 'cbse cgpa to percentage', 'how to convert cgpa to marks'],
    canonicalPath: '/calculators/student/cgpa',
  },
  inputs: [
    {
      id: 'cgpa',
      label: 'Your CGPA (out of 10)',
      type: 'number',
      defaultValue: 8.4,
      min: 0,
      max: 10,
      step: 0.01,
      placeholder: 'e.g. 8.4',
    },
    {
      id: 'universityFormula',
      label: 'Board / University Formula',
      type: 'select',
      defaultValue: 'cbse',
      options: [
        { label: 'CBSE / AICTE (CGPA × 9.5)', value: 'cbse' },
        { label: 'VTU Belagavi ((CGPA - 0.75) × 10)', value: 'vtu' },
        { label: 'Mumbai University Engineering (7.1 × CGPA + 12)', value: 'mumbai' },
        { label: 'KTU Kerala (10 × CGPA - 3.75)', value: 'ktu' },
        { label: 'Direct 10-Point Scale (CGPA × 10)', value: 'standard' },
      ],
    },
  ],
  inputSchema: cgpaInputSchema,
  calculate: (inputs: CgpaInput): CalculatorResult => {
    const res = calculateCgpaPure(inputs.cgpa, inputs.universityFormula);

    return {
      primary: {
        id: 'percentage',
        label: 'Equivalent Percentage',
        value: res.percentage,
        formattedValue: formatPercentage(res.percentage, 2),
        type: 'percentage',
        isPrimary: true,
      },
      secondary: [
        {
          id: 'division',
          label: 'Academic Classification',
          value: res.division,
          formattedValue: res.division,
          type: 'badge',
          badgeColor: res.badgeColor,
        },
        {
          id: 'gpaScale',
          label: 'Original CGPA',
          value: inputs.cgpa,
          formattedValue: `${inputs.cgpa.toFixed(2)} / 10.0`,
          type: 'text',
        },
      ],
      summaryExplanation: `A CGPA of ${inputs.cgpa.toFixed(2)} converts to ${formatPercentage(res.percentage, 2)} under the chosen rule (${res.formulaUsed}). This places you in the "${res.division}" category.`,
      detailedExplanation: `In India, higher education institutions and employer job application portals frequently require percentage equivalents for competitive eligibility cutoffs (such as 60% or 65% aggregate minimums).`,
      formula: {
        expression: res.formulaUsed,
        description: 'University authorized conversion equation.',
        variables: [{ name: 'CGPA', description: 'Cumulative Grade Point Average on 10-point scale' }],
      },
      raw: res,
    };
  },
  examples: [
    {
      title: '8.4 CGPA in CBSE',
      description: 'CBSE standard 9.5 multiplier.',
      inputs: { cgpa: 8.4, universityFormula: 'cbse' },
      expectedPrimary: '79.80%',
    },
    {
      title: '7.8 CGPA in VTU Belagavi',
      description: 'VTU technical university conversion.',
      inputs: { cgpa: 7.8, universityFormula: 'vtu' },
      expectedPrimary: '70.50%',
    },
  ],
  faq: [
    {
      question: 'Why does CBSE multiply CGPA by 9.5 instead of 10?',
      answer: 'CBSE analysed marks of past cohorts scoring between grade A1 and B2. The statistical mean score of students in each band converged to 95% of the upper bound, establishing 9.5 as the scientifically validated multiplier for 10-point grades.',
    },
    {
      question: 'Can I use this for SGPA (Semester Grade Point Average)?',
      answer: 'Yes! The mathematical conversion formulas for individual semester SGPA and cumulative multi-semester CGPA use the exact same percentage mapping rules.',
    },
  ],
  relatedCalculatorIds: ['attendance', 'ctc-to-take-home'],
};
