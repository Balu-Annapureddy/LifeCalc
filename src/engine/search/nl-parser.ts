export interface ParsedQuery {
  calculatorId: string;
  slug: string;
  matchedIntent: string;
  extractedInputs: Record<string, any>;
  confidence: number;
}

/**
 * Parses numeric values with Indian word multipliers:
 * 10 lakh -> 1000000
 * 1.5 crore -> 15000000
 * 50k -> 50000
 */
export function parseIndianAmount(text: string): number | null {
  const clean = text.toLowerCase().replace(/,/g, '');

  const croreMatch = clean.match(/([\d.]+)\s*(?:cr|crore|crores)/);
  if (croreMatch) return parseFloat(croreMatch[1]) * 10000000;

  const lakhMatch = clean.match(/([\d.]+)\s*(?:l|lakh|lakhs|lac|lacs)/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const kMatch = clean.match(/([\d.]+)\s*(?:k|thousand)/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  const rawNumberMatch = clean.match(/(?:rs\.?|₹)?\s*([\d]+)/);
  if (rawNumberMatch) return parseFloat(rawNumberMatch[1]);

  return null;
}

/**
 * Natural language intent parser for LifeCalc search.
 * Deterministic and instantaneous with 0 network latency.
 */
export function parseNaturalLanguageQuery(query: string): ParsedQuery | null {
  const lower = query.toLowerCase().trim();
  if (!lower) return null;

  // 1. EMI / Loan parsing: "10 lakh loan at 9% for 5 years" or "home loan emi 50 lakhs 8.5% 20 yr"
  if (lower.includes('loan') || lower.includes('emi') || lower.includes('mortgage') || lower.includes('borrow')) {
    let principal: number | null = null;

    // Look for amount followed by or preceded by loan
    const amountMatches = lower.match(/(\d+(?:\.\d+)?\s*(?:cr|crore|crores|lakh|lakhs|lac|lacs|k)?)/g);
    if (amountMatches) {
      for (const m of amountMatches) {
        const parsed = parseIndianAmount(m);
        if (parsed && parsed >= 10000) {
          principal = parsed;
          break;
        }
      }
    }

    // Rate parsing: "9%", "8.5 percent"
    let rate = 9.0;
    const rateMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    if (rateMatch) rate = parseFloat(rateMatch[1]);

    // Tenure parsing: "5 years", "20 yrs", "36 months"
    let tenureYears = 5;
    const yearMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:yr|yrs|year|years)/);
    const monthMatch = lower.match(/(\d+)\s*(?:mo|month|months)/);
    if (yearMatch) tenureYears = parseFloat(yearMatch[1]);
    else if (monthMatch) tenureYears = parseFloat(monthMatch[1]) / 12;

    return {
      calculatorId: 'emi',
      slug: 'emi',
      matchedIntent: 'Loan EMI Repayment',
      extractedInputs: {
        principal: principal || 1000000,
        annualRate: rate,
        tenureYears,
      },
      confidence: 0.95,
    };
  }

  // 2. SIP parsing: "sip 5000 12% 15 years" or "invest 10000 monthly"
  if (lower.includes('sip') || (lower.includes('invest') && lower.includes('month'))) {
    let monthly = 5000;
    const amountMatch = lower.match(/(?:sip|invest)?\s*(\d+(?:\.\d+)?\s*(?:k|thousand|lakh|l)?)?/);
    if (amountMatch && amountMatch[1]) {
      const parsed = parseIndianAmount(amountMatch[1]);
      if (parsed) monthly = parsed;
    }

    let rate = 12.0;
    const rateMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    if (rateMatch) rate = parseFloat(rateMatch[1]);

    let years = 15;
    const yearMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:yr|yrs|year|years)/);
    if (yearMatch) years = parseFloat(yearMatch[1]);

    return {
      calculatorId: 'sip',
      slug: 'sip',
      matchedIntent: 'Systematic Investment Plan',
      extractedInputs: {
        monthlyInvestment: monthly,
        expectedReturnRate: rate,
        investmentPeriodYears: years,
      },
      confidence: 0.9,
    };
  }

  // 3. CGPA parsing: "8.4 cgpa", "convert cgpa 9.0"
  if (lower.includes('cgpa') || lower.includes('sgpa')) {
    const scoreMatch = lower.match(/(\d+(?:\.\d+)?)/);
    const cgpa = scoreMatch ? parseFloat(scoreMatch[1]) : 8.0;

    let formula: 'cbse' | 'vtu' | 'mumbai' | 'ktu' | 'standard' = 'cbse';
    if (lower.includes('vtu')) formula = 'vtu';
    else if (lower.includes('mumbai')) formula = 'mumbai';
    else if (lower.includes('ktu')) formula = 'ktu';

    return {
      calculatorId: 'cgpa',
      slug: 'cgpa',
      matchedIntent: 'CGPA to Percentage Conversion',
      extractedInputs: {
        cgpa: Math.min(10, Math.max(0, cgpa)),
        universityFormula: formula,
      },
      confidence: 0.95,
    };
  }

  // 4. Attendance parsing: "attendance 38 out of 50" or "attendance 75%"
  if (lower.includes('attendance') || lower.includes('bunk')) {
    const fractionMatch = lower.match(/(\d+)\s*(?:\/|out of)\s*(\d+)/);
    let present = 38;
    let total = 50;
    if (fractionMatch) {
      present = parseInt(fractionMatch[1]);
      total = parseInt(fractionMatch[2]);
    }

    return {
      calculatorId: 'attendance',
      slug: 'attendance',
      matchedIntent: 'College Attendance 75% Tracker',
      extractedInputs: {
        presentClasses: present,
        totalClasses: total,
        targetPercentage: 75,
      },
      confidence: 0.9,
    };
  }

  // 5. Affordability parsing: "can i afford 1.2 lakh laptop"
  if (lower.includes('afford') || lower.includes('can i buy')) {
    const amountMatch = lower.match(/(\d+(?:\.\d+)?\s*(?:cr|crore|lakh|lacs|k)?)/);
    let itemPrice = 120000;
    if (amountMatch) {
      const parsed = parseIndianAmount(amountMatch[1]);
      if (parsed && parsed >= 500) itemPrice = parsed;
    }

    return {
      calculatorId: 'can-i-afford-this',
      slug: 'can-i-afford-this',
      matchedIntent: 'Purchase Affordability Assessment',
      extractedInputs: {
        itemPrice,
        monthlyIncome: 75000,
        monthlyExpenses: 35000,
      },
      confidence: 0.85,
    };
  }

  // 6. Fuel parsing: "fuel 300 km" or "petrol 250km mileage 16"
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('mileage') || lower.includes('diesel')) {
    const distMatch = lower.match(/(\d+)\s*(?:km|kms|kilometer|kilometres)/);
    const distanceKm = distMatch ? parseInt(distMatch[1]) : 250;

    return {
      calculatorId: 'fuel-cost',
      slug: 'fuel-cost',
      matchedIntent: 'Fuel Cost & Mileage Trip Planner',
      extractedInputs: {
        distanceKm,
        mileageKmpl: 15,
        fuelPricePerLitre: 102,
      },
      confidence: 0.9,
    };
  }

  return null;
}
