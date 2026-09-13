import { CalculatorDefinition, CalculatorCategory } from './types';
import { emiCalculator } from './calculators/money/emi';
import { sipCalculator } from './calculators/money/sip';
import { ctcCalculator } from './calculators/money/ctc-to-take-home';
import { compoundInterestCalculator } from './calculators/money/compound-interest';
import { cagrCalculator } from './calculators/money/cagr';
import { gstCalculator } from './calculators/money/gst';
import { cgpaCalculator } from './calculators/student/cgpa';
import { attendanceCalculator } from './calculators/student/attendance';
import { canIAffordThisCalculator } from './calculators/buying/can-i-afford-this';
import { emiVsCashCalculator } from './calculators/buying/emi-vs-cash';
import { totalOwnershipCostCalculator } from './calculators/buying/total-ownership-cost';
import { ageCalculator } from './calculators/time/age';
import { fuelCalculator } from './calculators/everyday/fuel-cost';
import { billSplitCalculator } from './calculators/money/bill-split';
import { discountCalculator } from './calculators/money/discount';

export class CalculatorRegistry {
  private calculators: Map<string, CalculatorDefinition<any>> = new Map();
  private slugMap: Map<string, string> = new Map();

  constructor() {
    this.register(emiCalculator);
    this.register(sipCalculator);
    this.register(ctcCalculator);
    this.register(compoundInterestCalculator);
    this.register(cagrCalculator);
    this.register(gstCalculator);
    this.register(billSplitCalculator);
    this.register(discountCalculator);
    this.register(cgpaCalculator);
    this.register(attendanceCalculator);
    this.register(canIAffordThisCalculator);
    this.register(emiVsCashCalculator);
    this.register(totalOwnershipCostCalculator);
    this.register(ageCalculator);
    this.register(fuelCalculator);
  }

  public register(calc: CalculatorDefinition<any>): void {
    this.calculators.set(calc.id, calc);
    this.slugMap.set(calc.slug, calc.id);
  }

  public getById(id: string): CalculatorDefinition<any> | undefined {
    return this.calculators.get(id);
  }

  public getBySlug(slug: string): CalculatorDefinition<any> | undefined {
    const id = this.slugMap.get(slug);
    if (!id) return undefined;
    return this.calculators.get(id);
  }

  public getAll(): CalculatorDefinition<any>[] {
    return Array.from(this.calculators.values());
  }

  public getByCategory(category: CalculatorCategory): CalculatorDefinition<any>[] {
    return this.getAll().filter(calc => calc.category === category);
  }

  public getRelated(calcId: string): CalculatorDefinition<any>[] {
    const calc = this.getById(calcId);
    if (!calc || !calc.relatedCalculatorIds) return [];

    return calc.relatedCalculatorIds
      .map(id => this.getById(id))
      .filter((c): c is CalculatorDefinition<any> => c !== undefined);
  }

  /**
   * Fast, typo-tolerant search across name, shortTitle, description, category, and SEO keywords.
   */
  public search(query: string): CalculatorDefinition<any>[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return this.getAll();

    const words = cleanQuery.split(/\s+/);

    return this.getAll()
      .map(calc => {
        let score = 0;
        const nameLower = calc.name.toLowerCase();
        const shortLower = (calc.shortTitle || '').toLowerCase();
        const descLower = calc.description.toLowerCase();
        const keywords = calc.seo.keywords.map(k => k.toLowerCase());

        // Exact match boosts
        if (nameLower === cleanQuery || shortLower === cleanQuery) score += 100;
        if (nameLower.startsWith(cleanQuery)) score += 50;

        // Word matches
        for (const w of words) {
          if (nameLower.includes(w)) score += 20;
          if (shortLower.includes(w)) score += 25;
          if (keywords.some(k => k.includes(w))) score += 15;
          if (descLower.includes(w)) score += 5;
        }

        return { calc, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.calc);
  }
}

// Singleton instance
export const registry = new CalculatorRegistry();
