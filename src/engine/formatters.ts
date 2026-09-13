export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface FormatOptions {
  currency?: SupportedCurrency;
  decimals?: number;
  useWords?: boolean; // e.g. "12.45 Lakh"
  compact?: boolean;
}

/**
 * Format a number as Indian Rupee or specified currency.
 * Preserves true mathematical value; only rounds the formatted string.
 */
export function formatCurrency(
  value: number,
  options: FormatOptions = {}
): string {
  if (isNaN(value) || !isFinite(value)) return '₹0';
  const currency = options.currency || 'INR';
  const decimals = options.decimals !== undefined ? options.decimals : 0;

  if (currency === 'INR') {
    if (options.useWords) {
      return formatIndianWords(value);
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format large Indian amounts in words: Thousand, Lakh, Crore.
 */
export function formatIndianWords(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 10000000) {
    const crores = abs / 10000000;
    return `${sign}₹${crores.toFixed(2).replace(/\.00$/, '')} Crore`;
  }
  if (abs >= 100000) {
    const lakhs = abs / 100000;
    return `${sign}₹${lakhs.toFixed(2).replace(/\.00$/, '')} Lakh`;
  }
  if (abs >= 1000) {
    const thousands = abs / 1000;
    return `${sign}₹${thousands.toFixed(2).replace(/\.00$/, '')} K`;
  }
  return formatCurrency(value, { decimals: 0 });
}

/**
 * Format numbers with Indian commas (e.g., 10,00,000) without currency symbol.
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage (e.g., 9.5%).
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0%';
  return `${value.toFixed(decimals).replace(/\.00$/, '')}%`;
}

/**
 * Format months into "X years Y months" or "X years".
 */
export function formatTenureMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = Math.round(totalMonths % 12);

  if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
  if (months === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${months} mo`;
}
