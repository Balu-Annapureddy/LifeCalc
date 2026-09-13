import { CategoryMeta, CalculatorCategory } from './types';

export const CATEGORIES: Record<CalculatorCategory, CategoryMeta> = {
  money: {
    id: 'money',
    name: 'Money & Everyday Expenses',
    description: 'Everyday costs, bill splitting, discounts, GST, loans & EMI, investments, and salary in-hand.',
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
    name: 'Age & Life',
    description: 'Exact age calculator, lifespan milestones, and birthday countdowns.',
    iconName: 'Clock',
    color: '#d97706',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
