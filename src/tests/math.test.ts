import { describe, it, expect } from 'vitest';
import { calculateEmiPure } from '../engine/calculators/money/emi';
import { calculateSipPure } from '../engine/calculators/money/sip';
import { calculateCompoundInterestPure } from '../engine/calculators/money/compound-interest';
import { calculateCagrPure } from '../engine/calculators/money/cagr';
import { calculateGstPure } from '../engine/calculators/money/gst';
import { calculateCtcPure } from '../engine/calculators/money/ctc-to-take-home';
import { calculateAttendancePure } from '../engine/calculators/student/attendance';
import { calculateCgpaPure } from '../engine/calculators/student/cgpa';
import { calculateAffordabilityPure } from '../engine/calculators/buying/can-i-afford-this';
import { calculateAgePure } from '../engine/calculators/time/age';
import { calculateFuelCostPure } from '../engine/calculators/everyday/fuel-cost';
import { calculateEmiVsCashPure } from '../engine/calculators/buying/emi-vs-cash';
import { calculateOwnershipCostPure } from '../engine/calculators/buying/total-ownership-cost';
import { calculateBillSplitPure } from '../engine/calculators/money/bill-split';
import { calculateDiscountPure } from '../engine/calculators/money/discount';

describe('Authoritative Mathematical Engine Tests', () => {
  describe('EMI Calculator Pure Math', () => {
    it('calculates standard 10 Lakh loan at 9% for 5 years accurately', () => {
      // P = 10,00,000, rate = 9%, tenure = 5 years (60 months)
      // Known standard banking EMI = ₹20,758
      const res = calculateEmiPure(1000000, 9, 5);
      expect(res.emi).toBe(20758);
      expect(res.totalPayment).toBe(1245480);
      expect(res.totalInterest).toBe(245480);
    });

    it('calculates 50 Lakh home loan at 8.5% for 20 years', () => {
      // P = 50,00,000, r = 8.5%, 240 months
      const res = calculateEmiPure(5000000, 8.5, 20);
      expect(res.emi).toBe(43391);
      expect(res.totalPayment).toBe(10413840);
    });

    it('handles 0% interest (No Cost EMI) correctly', () => {
      const res = calculateEmiPure(120000, 0, 1);
      expect(res.emi).toBe(10000);
      expect(res.totalInterest).toBe(0);
      expect(res.totalPayment).toBe(120000);
    });

    // Property-based monotonicity tests
    it('satisfies monotonicity: higher principal always increases EMI', () => {
      const emi1 = calculateEmiPure(1000000, 9, 5).emi;
      const emi2 = calculateEmiPure(1200000, 9, 5).emi;
      expect(emi2).toBeGreaterThan(emi1);
    });

    it('satisfies monotonicity: higher interest rate always increases EMI and total interest', () => {
      const res1 = calculateEmiPure(1000000, 8.5, 5);
      const res2 = calculateEmiPure(1000000, 9.5, 5);
      expect(res2.emi).toBeGreaterThan(res1.emi);
      expect(res2.totalInterest).toBeGreaterThan(res1.totalInterest);
    });

    it('satisfies tenure relationship: longer tenure reduces EMI but increases total interest', () => {
      const fiveYear = calculateEmiPure(1000000, 9, 5);
      const tenYear = calculateEmiPure(1000000, 9, 10);
      expect(tenYear.emi).toBeLessThan(fiveYear.emi);
      expect(tenYear.totalInterest).toBeGreaterThan(fiveYear.totalInterest);
    });
  });

  describe('SIP Calculator Pure Math', () => {
    it('calculates ₹5,000/month at 12% for 20 years correctly', () => {
      // FV = 5000 * [((1+0.01)^240 - 1)/0.01] * 1.01
      const res = calculateSipPure(5000, 12, 20);
      expect(res.totalInvested).toBe(1200000);
      // Expected FV is ~₹49.95 Lakhs
      expect(res.futureValue).toBe(4995740);
      expect(res.wealthGain).toBe(3795740);
    });

    it('calculates ₹10,000/month at 12% for 10 years correctly', () => {
      const res = calculateSipPure(10000, 12, 10);
      expect(res.totalInvested).toBe(1200000);
      expect(res.futureValue).toBe(2323391);
      expect(res.wealthGain).toBe(1123391);
    });
  });

  describe('Compound Interest Pure Math', () => {
    it('calculates ₹1 Lakh at 8% quarterly for 5 years', () => {
      // 100000 * (1 + 0.08/4)^(4*5) = 100000 * (1.02)^20 = 148594.73
      const res = calculateCompoundInterestPure(100000, 8, 5, 'quarterly');
      expect(res.totalAmount).toBe(148595);
      expect(res.totalInterest).toBe(48595);
    });
  });

  describe('CAGR Pure Math', () => {
    it('calculates CAGR for doubling money in 5 years (₹1L to ₹2L)', () => {
      // (2)^(1/5) - 1 = 14.8698%
      const res = calculateCagrPure(100000, 200000, 5);
      expect(res.cagr).toBeCloseTo(14.87, 1);
      expect(res.absoluteGrowth).toBe(100000);
      expect(res.absolutePercentage).toBe(100);
    });
  });

  describe('GST Pure Math', () => {
    it('adds 18% GST correctly to ₹10,000 base', () => {
      const res = calculateGstPure(10000, 18, 'exclusive');
      expect(res.netAmount).toBe(10000);
      expect(res.gstAmount).toBe(1800);
      expect(res.totalAmount).toBe(11800);
      expect(res.cgst).toBe(900);
      expect(res.sgst).toBe(900);
    });

    it('removes 18% GST correctly from ₹1,180 invoice', () => {
      const res = calculateGstPure(1180, 18, 'inclusive');
      expect(res.netAmount).toBe(1000);
      expect(res.gstAmount).toBe(180);
      expect(res.totalAmount).toBe(1180);
    });
  });

  describe('CTC to Take-Home Salary Math', () => {
    it('calculates ₹6 Lakh CTC under New Regime with zero tax due to rebate', () => {
      const res = calculateCtcPure({
        annualCtc: 600000,
        regime: 'new',
        bonusPercent: 0,
        employerPfIncludedInCtc: true,
        customMonthlyDeductions: 0,
        oldRegimeDeductions: 0,
      });
      // Under ₹7 Lakhs taxable income, Section 87A rebate gives 0 tax
      expect(res.totalAnnualTax).toBe(0);
      expect(res.monthlyInHand).toBeGreaterThan(45000);
    });

    it('calculates ₹12 Lakh CTC under New Regime with standard deduction applied', () => {
      const res = calculateCtcPure({
        annualCtc: 1200000,
        regime: 'new',
        bonusPercent: 10,
        employerPfIncludedInCtc: true,
        customMonthlyDeductions: 0,
        oldRegimeDeductions: 0,
      });
      expect(res.monthlyInHand).toBeGreaterThan(70000);
      expect(res.totalAnnualTax).toBeGreaterThan(0);
    });
  });

  describe('Attendance Calculator Math', () => {
    it('calculates exact lectures needed to reach 75% when attendance is low', () => {
      // 25 attended out of 40 = 62.5%. Target 75%.
      // (25 + x) / (40 + x) >= 0.75 => x = (0.75*40 - 25)/(1 - 0.75) = (30 - 25)/0.25 = 20 classes
      const res = calculateAttendancePure(25, 40, 75);
      expect(res.isEligible).toBe(false);
      expect(res.classesNeeded).toBe(20);
      expect(res.canBunk).toBe(0);
    });

    it('calculates safe bunk lectures when attendance exceeds 75%', () => {
      // 40 attended out of 45 = 88.89%. Target 75%.
      // 40 / (45 + y) >= 0.75 => 45 + y <= 53.33 => y = 8 classes
      const res = calculateAttendancePure(40, 45, 75);
      expect(res.isEligible).toBe(true);
      expect(res.canBunk).toBe(8);
      expect(res.classesNeeded).toBe(0);
    });
  });

  describe('CGPA Conversion Math', () => {
    it('converts CBSE 8.4 CGPA using 9.5 multiplier', () => {
      const res = calculateCgpaPure(8.4, 'cbse');
      expect(res.percentage).toBe(79.8);
      expect(res.division).toBe('First Class with Distinction (Honours)');
    });

    it('converts VTU 8.0 CGPA using (CGPA - 0.75) * 10', () => {
      const res = calculateCgpaPure(8.0, 'vtu');
      expect(res.percentage).toBe(72.5);
    });
  });

  describe('Can I Afford This Decision Engine', () => {
    it('identifies safe purchase when income and cash flow are comfortable', () => {
      const res = calculateAffordabilityPure({
        monthlyIncome: 80000,
        monthlyExpenses: 30000,
        existingEmis: 5000,
        currentSavings: 200000,
        itemPrice: 60000,
        paymentMode: 'emi',
        downPayment: 10000,
        emiTenureMonths: 12,
        emiInterestRate: 0,
      });
      expect(res.verdict).toBe('Safe & Affordable');
      expect(res.badgeColor).toBe('green');
      expect(res.freeCashAfter).toBeGreaterThan(40000);
    });

    it('flags high financial risk when purchase causes cash flow deficit', () => {
      const res = calculateAffordabilityPure({
        monthlyIncome: 30000,
        monthlyExpenses: 25000,
        existingEmis: 4000,
        currentSavings: 10000,
        itemPrice: 150000,
        paymentMode: 'emi',
        downPayment: 5000,
        emiTenureMonths: 12,
        emiInterestRate: 15,
      });
      expect(res.verdict).toBe('High Financial Risk');
      expect(res.badgeColor).toBe('red');
    });
  });

  describe('Age Calculator Math', () => {
    it('computes exact elapsed time without negative month/day carryover', () => {
      const res = calculateAgePure('2000-05-15', '2026-09-13');
      expect(res.years).toBe(26);
      expect(res.months).toBe(3);
      expect(res.days).toBe(29);
      expect(res.totalDays).toBeGreaterThan(9000);
    });
  });

  describe('EMI vs Cash Math', () => {
    it('compares full cash upfront with 10% discount against zero percent loan', () => {
      const res = calculateEmiVsCashPure({
        purchasePrice: 100000,
        cashDiscountPercent: 10,
        downPayment: 0,
        loanTenureMonths: 12,
        loanAnnualRate: 0,
        investmentReturnRate: 10,
      });
      expect(res.cashPaid).toBe(90000);
      expect(res.totalEmiRepayment).toBe(100000);
      expect(res.isEmiBetter).toBe(false);
      expect(res.recommendation).toContain('Pay Cash');
    });
  });

  describe('Vehicle Total Ownership Cost Math', () => {
    it('calculates comprehensive 5-year ownership cost with fuel, insurance, and resale', () => {
      const res = calculateOwnershipCostPure({
        vehiclePrice: 1200000,
        ownershipYears: 5,
        downPayment: 300000,
        loanInterestRate: 9,
        loanTenureYears: 5,
        monthlyRunningKm: 1000,
        mileageKmpl: 15,
        fuelPricePerLitre: 102,
        annualInsurance: 25000,
        annualMaintenance: 15000,
        expectedResalePercent: 45,
      });
      expect(res.totalKmDriven).toBe(60000);
      expect(res.estimatedResaleValue).toBe(540000);
      expect(res.netTotalOwnershipCost).toBeGreaterThan(1000000);
      expect(res.effectiveCostPerMonth).toBeGreaterThan(20000);
      expect(res.effectiveCostPerKm).toBeGreaterThan(15);
    });
  });

  describe('Bill Split & Tip Math', () => {
    it('splits bill evenly with tip and additional charges', () => {
      // ₹2,400 bill, 4 people, 10% tip (₹240), ₹0 charges => Total ₹2,640 => ₹660/person
      const res = calculateBillSplitPure(2400, 4, 10, 0);
      expect(res.tipAmount).toBe(240);
      expect(res.grandTotal).toBe(2640);
      expect(res.perPerson).toBe(660);
      expect(res.perPersonBase).toBe(600);
      expect(res.perPersonTip).toBe(60);
    });

    it('handles 0% tip and delivery charges correctly', () => {
      // ₹1,000 bill, 2 people, 0% tip, ₹50 delivery charge => ₹1,050 => ₹525/person
      const res = calculateBillSplitPure(1000, 2, 0, 50);
      expect(res.tipAmount).toBe(0);
      expect(res.grandTotal).toBe(1050);
      expect(res.perPerson).toBe(525);
    });
  });

  describe('Discount & Savings Math', () => {
    it('calculates single percentage discount accurately', () => {
      // ₹1,000 item with 25% discount => ₹750 price, ₹250 saved
      const res = calculateDiscountPure(1000, 25, 0, 0);
      expect(res.finalPrice).toBe(750);
      expect(res.totalSaved).toBe(250);
      expect(res.effectiveDiscountPercentage).toBe(25);
    });

    it('calculates stacked sequential discounts correctly', () => {
      // ₹3,500 item, 30% sale discount, 10% extra coupon => ₹2,450 - ₹245 = ₹2,205
      const res = calculateDiscountPure(3500, 30, 10, 0);
      expect(res.finalPrice).toBe(2205);
      expect(res.totalSaved).toBe(1295);
      expect(res.effectiveDiscountPercentage).toBe(37);
    });

    it('factors in post-discount tax accurately', () => {
      // ₹2,000 item with 50% discount (₹1,000) + 18% GST (₹180) => ₹1,180
      const res = calculateDiscountPure(2000, 50, 0, 18);
      expect(res.discountedPrice).toBe(1000);
      expect(res.taxAmount).toBe(180);
      expect(res.finalPrice).toBe(1180);
      expect(res.totalSaved).toBe(1000);
    });
  });
});
