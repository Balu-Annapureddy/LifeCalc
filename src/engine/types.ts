import { z } from 'zod';

export type CalculatorCategory =
  | 'money'
  | 'student'
  | 'buying'
  | 'time';

export interface CategoryMeta {
  id: CalculatorCategory;
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export type InputFieldType =
  | 'number'
  | 'currency'
  | 'percentage'
  | 'select'
  | 'radio'
  | 'date'
  | 'slider'
  | 'boolean';

export interface SelectOption {
  label: string;
  value: string | number | boolean;
}

export interface InputDefinition {
  id: string;
  label: string;
  type: InputFieldType;
  description?: string;
  defaultValue: any | (() => any);
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: SelectOption[];
  required?: boolean;
}

export interface ResultItem {
  id: string;
  label: string;
  value: number | string;
  formattedValue: string;
  type: 'currency' | 'number' | 'percentage' | 'text' | 'date' | 'badge';
  badgeColor?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  isPrimary?: boolean;
  helpText?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface ChartDefinition {
  type: 'donut' | 'bar' | 'area' | 'line';
  title?: string;
  data: ChartDataPoint[];
  series?: ChartSeries[];
}

export interface BreakdownRow {
  [key: string]: string | number;
}

export interface BreakdownTable {
  title: string;
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  rows: BreakdownRow[];
}

export interface CalculatorResult {
  primary: ResultItem;
  secondary: ResultItem[];
  summaryExplanation: string;
  detailedExplanation?: string;
  assumptions?: string[];
  caveats?: string[];
  formula?: {
    expression: string;
    description: string;
    variables: { name: string; description: string }[];
  };
  charts?: ChartDefinition[];
  breakdownTable?: BreakdownTable;
  raw: Record<string, any>;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CalculatorExample {
  title: string;
  description: string;
  inputs: Record<string, any>;
  expectedPrimary: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalPath: string;
}

export interface CalculatorDefinition<TInput = any> {
  id: string;
  slug: string;
  name: string;
  shortTitle?: string;
  category: CalculatorCategory;
  subcategory?: string;
  description: string;
  badge?: string;
  seo: SeoMetadata;
  inputs: InputDefinition[];
  inputSchema: z.ZodType<TInput, any, any>;
  calculate: (inputs: TInput) => CalculatorResult;
  examples: CalculatorExample[];
  faq: FAQItem[];
  relatedCalculatorIds: string[];
  disclaimer?: string;
}
