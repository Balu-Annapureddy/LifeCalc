import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageQuery, parseIndianAmount } from '../engine/search/nl-parser';

describe('Natural Language Calculator Parser', () => {
  describe('Indian Amount Conversion', () => {
    it('parses lakh and crore variations accurately', () => {
      expect(parseIndianAmount('10 lakh')).toBe(1000000);
      expect(parseIndianAmount('12.5 lakhs')).toBe(1250000);
      expect(parseIndianAmount('1.5 crore')).toBe(15000000);
      expect(parseIndianAmount('50k')).toBe(50000);
      expect(parseIndianAmount('₹75,000')).toBe(75000);
    });
  });

  describe('Intent Extraction', () => {
    it('parses loan query: "10 lakh loan at 9% for 5 years"', () => {
      const parsed = parseNaturalLanguageQuery('10 lakh loan at 9% for 5 years');
      expect(parsed).not.toBeNull();
      expect(parsed?.calculatorId).toBe('emi');
      expect(parsed?.extractedInputs.principal).toBe(1000000);
      expect(parsed?.extractedInputs.annualRate).toBe(9);
      expect(parsed?.extractedInputs.tenureYears).toBe(5);
    });

    it('parses SIP query: "sip 5000 12% 15 years"', () => {
      const parsed = parseNaturalLanguageQuery('sip 5000 12% 15 years');
      expect(parsed).not.toBeNull();
      expect(parsed?.calculatorId).toBe('sip');
      expect(parsed?.extractedInputs.monthlyInvestment).toBe(5000);
      expect(parsed?.extractedInputs.expectedReturnRate).toBe(12);
      expect(parsed?.extractedInputs.investmentPeriodYears).toBe(15);
    });

    it('parses CGPA conversion query: "8.4 cgpa to percentage"', () => {
      const parsed = parseNaturalLanguageQuery('8.4 cgpa to percentage');
      expect(parsed).not.toBeNull();
      expect(parsed?.calculatorId).toBe('cgpa');
      expect(parsed?.extractedInputs.cgpa).toBe(8.4);
    });

    it('parses attendance bunk query: "attendance 38 out of 50"', () => {
      const parsed = parseNaturalLanguageQuery('attendance 38 out of 50');
      expect(parsed).not.toBeNull();
      expect(parsed?.calculatorId).toBe('attendance');
      expect(parsed?.extractedInputs.presentClasses).toBe(38);
      expect(parsed?.extractedInputs.totalClasses).toBe(50);
    });
  });
});
