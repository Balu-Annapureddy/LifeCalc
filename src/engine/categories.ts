import { CategoryMeta, CalculatorCategory } from './types';

export const CATEGORIES: Record<CalculatorCategory, CategoryMeta> = {
  money: {
    id: 'money',
    name: 'Money & Loans',
    description: 'EMIs, loans, investments, salary in-hand, tax estimates, and wealth planning.',
    iconName: 'IndianRupee',
    color: '#2563eb',
  },
  student: {
    id: 'student',
    name: 'Student & Academics',
    description: 'CGPA, SGPA, attendance target, marks needed, and academic grade calculators.',
    iconName: 'GraduationCap',
    color: '#7c3aed',
  },
  buying: {
    id: 'buying',
    name: 'Buying & Affordability',
    description: 'Decision tools: Can I afford this?, EMI vs Cash, car/bike total ownership cost.',
    iconName: 'ShoppingBag',
    color: '#059669',
  },
  time: {
    id: 'time',
    name: 'Time & Dates',
    description: 'Age calculator, date differences, working days, and countdown milestones.',
    iconName: 'Clock',
    color: '#d97706',
  },
  technology: {
    id: 'technology',
    name: 'Technology & Data',
    description: 'Download/upload time, internet speed, storage capacity, and data usage.',
    iconName: 'Cpu',
    color: '#0891b2',
  },
  everyday: {
    id: 'everyday',
    name: 'Everyday Calculations',
    description: 'Fuel cost, mileage, bill split, tip, unit conversions, and percentages.',
    iconName: 'Calculator',
    color: '#4f46e5',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
