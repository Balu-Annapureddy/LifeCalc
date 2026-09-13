import { describe, it, expect } from 'vitest';
import { registry } from '@/engine/registry';
import { calculateEmiPure } from '@/engine/calculators/money/emi';
import { calculateSipPure } from '@/engine/calculators/money/sip';
import { calculateCompoundInterestPure } from '@/engine/calculators/money/compound-interest';
import { calculateCagrPure } from '@/engine/calculators/money/cagr';
import { calculateGstPure } from '@/engine/calculators/money/gst';
import { calculateCtcPure } from '@/engine/calculators/money/ctc-to-take-home';
import { calculateAttendancePure } from '@/engine/calculators/student/attendance';
import { calculateCgpaPure } from '@/engine/calculators/student/cgpa';
import { calculateAffordabilityPure } from '@/engine/calculators/buying/can-i-afford-this';
import { calculateAgePure } from '@/engine/calculators/time/age';
import { calculateFuelCostPure } from '@/engine/calculators/everyday/fuel-cost';
import { calculateEmiVsCashPure } from '@/engine/calculators/buying/emi-vs-cash';
import { calculateOwnershipCostPure } from '@/engine/calculators/buying/total-ownership-cost';

describe('Calculator Integrity & Boundary Regression Suite (All 13 Calculators)', () => {
  it('1. EMI: Boundary and zero-rate loan calculations', () => {
    // 0% interest
    const zeroRate = calculateEmiPure(60000, 0, 1);
    expect(zeroRate.emi).toBe(5000);
    expect(zeroRate.totalInterest).toBe(0);
    expect(zeroRate.totalPayment).toBe(60000);
    expect(zeroRate.principalRatio).toBe(100);
    expect(zeroRate.interestRatio).toBe(0);

    // Large mortgage (₹1 Crore at 8.75% for 30 years)
    const largeLoan = calculateEmiPure(10000000, 8.75, 30);
    expect(largeLoan.emi).toBe(78670);
    expect(largeLoan.totalPayment).toBeGreaterThan(10000000);
  });

  it('2. SIP: Zero return rate and long-term compounding', () => {
    const zeroReturn = calculateSipPure(5000, 0, 5);
    expect(zeroReturn.futureValue).toBe(300000);
    expect(zeroReturn.totalInvested).toBe(300000);
    expect(zeroReturn.wealthGain).toBe(0);

    const normalSip = calculateSipPure(10000, 12, 10);
    expect(normalSip.futureValue).toBe(2323391);
    expect(normalSip.totalInvested).toBe(1200000);
    expect(normalSip.wealthGain).toBe(1123391);
  });

  it('3. Compound Interest: Compounding frequency variations', () => {
    // ₹1,00,000 at 10% for 2 years
    const yearly = calculateCompoundInterestPure(100000, 10, 2, 'annually');
    expect(yearly.totalAmount).toBe(121000);

    const quarterly = calculateCompoundInterestPure(100000, 10, 2, 'quarterly');
    expect(quarterly.totalAmount).toBeGreaterThan(yearly.totalAmount);

    const monthly = calculateCompoundInterestPure(100000, 10, 2, 'monthly');
    expect(monthly.totalAmount).toBeGreaterThan(quarterly.totalAmount);
  });

  it('4. CAGR: Positive, negative, and single-year returns', () => {
    // Double in 5 years: CAGR ~14.87%
    const cagr = calculateCagrPure(100000, 200000, 5);
    expect(cagr.cagr).toBeCloseTo(14.87, 1);

    // Loss: 1,00,000 down to 80,000 in 2 years: CAGR -10.56%
    const lossCagr = calculateCagrPure(100000, 80000, 2);
    expect(lossCagr.cagr).toBeLessThan(0);
    expect(lossCagr.absoluteGrowth).toBe(-20000);
  });

  it('5. GST: Inclusive, exclusive, and standard tax rates', () => {
    // Exclusive: ₹10,000 item + 18% GST = ₹11,800
    const exclusive = calculateGstPure(10000, 18, 'exclusive');
    expect(exclusive.gstAmount).toBe(1800);
    expect(exclusive.totalAmount).toBe(11800);
    expect(exclusive.cgst).toBe(900);
    expect(exclusive.sgst).toBe(900);

    // Inclusive: ₹11,800 contains ₹1,800 GST
    const inclusive = calculateGstPure(11800, 18, 'inclusive');
    expect(inclusive.gstAmount).toBe(1800);
    expect(inclusive.netAmount).toBe(10000);
  });

  it('6. CTC to Take-Home: New vs Old Tax Regime and Section 87A rebate', () => {
    // ₹7,00,000 CTC under New Regime has 0 income tax due to 87A rebate
    const ctc7L = calculateCtcPure({
      annualCtc: 700000,
      regime: 'new',
      bonusPercent: 0,
      employerPfIncludedInCtc: true,
      customMonthlyDeductions: 0,
      oldRegimeDeductions: 0,
    });
    expect(ctc7L.totalAnnualTax).toBe(0);
    expect(ctc7L.monthlyInHand).toBeGreaterThan(50000);

    // High income CTC: ₹24,00,000
    const ctc24L = calculateCtcPure({
      annualCtc: 2400000,
      regime: 'new',
      bonusPercent: 10,
      employerPfIncludedInCtc: true,
      customMonthlyDeductions: 0,
      oldRegimeDeductions: 0,
    });
    expect(ctc24L.totalAnnualTax).toBeGreaterThan(300000);
  });

  it('7. Attendance: Edge cases, zero classes, and 100% target', () => {
    // Zero total classes
    const zeroClass = calculateAttendancePure(0, 0, 75);
    expect(zeroClass.currentPercentage).toBe(0);
    expect(zeroClass.isEligible).toBe(false);

    // 40 out of 50 = 80%, target 75% -> can bunk
    const canBunk = calculateAttendancePure(40, 50, 75);
    expect(canBunk.isEligible).toBe(true);
    expect(canBunk.canBunk).toBeGreaterThan(0);

    // Shortage: 30 out of 50 = 60%, target 75% -> need classes
    const shortage = calculateAttendancePure(30, 50, 75);
    expect(shortage.isEligible).toBe(false);
    expect(shortage.classesNeeded).toBe(30);
  });

  it('8. CGPA to Percentage: Standard university conversions', () => {
    // CBSE multiplier 9.5
    const cbse = calculateCgpaPure(8.4, 'cbse');
    expect(cbse.percentage).toBeCloseTo(79.8, 1);

    // 10.0 CGPA
    const perfect = calculateCgpaPure(10, 'cbse');
    expect(perfect.percentage).toBe(95);
  });

  it('9. Can I Afford This: Affordability threshold checks', () => {
    // High salary, low expenses, small item -> Affordable
    const safe = calculateAffordabilityPure({
      monthlyIncome: 100000,
      monthlyExpenses: 30000,
      existingEmis: 0,
      currentSavings: 200000,
      itemPrice: 20000,
      paymentMode: 'cash',
      downPayment: 20000,
      emiTenureMonths: 12,
      emiInterestRate: 0,
    });
    expect(safe.verdict).toBe('Safe & Affordable');

    // Low salary, high expenses, very expensive item -> Risky / Cannot Afford
    const risky = calculateAffordabilityPure({
      monthlyIncome: 30000,
      monthlyExpenses: 28000,
      existingEmis: 4000,
      currentSavings: 5000,
      itemPrice: 150000,
      paymentMode: 'emi',
      downPayment: 5000,
      emiTenureMonths: 12,
      emiInterestRate: 15,
    });
    expect(risky.verdict).not.toBe('Safe & Affordable');
  });

  it('10. EMI vs Cash: Factoring in investment opportunity returns', () => {
    const result = calculateEmiVsCashPure({
      purchasePrice: 100000,
      cashDiscountPercent: 5,
      downPayment: 10000,
      loanTenureMonths: 12,
      loanAnnualRate: 12,
      investmentReturnRate: 10,
    });
    expect(result.recommendation).toBeDefined();
    expect(result.costDifference).toBeGreaterThanOrEqual(0);
  });

  it('11. Total Ownership Cost: 5-year vehicle true ownership model', () => {
    const cost = calculateOwnershipCostPure({
      vehiclePrice: 1000000,
      ownershipYears: 5,
      downPayment: 200000,
      loanInterestRate: 9,
      loanTenureYears: 5,
      monthlyRunningKm: 1000,
      mileageKmpl: 15,
      fuelPricePerLitre: 100,
      annualInsurance: 25000,
      annualMaintenance: 15000,
      expectedResalePercent: 40,
    });
    expect(cost.netTotalOwnershipCost).toBeGreaterThan(1000000);
    expect(cost.estimatedResaleValue).toBe(400000);
  });

  it('12. Age Calculator: Exact day, month, and year differences', () => {
    const age = calculateAgePure('2000-01-01', '2026-09-13');
    expect(age.years).toBe(26);
    expect(age.months).toBe(8);
    expect(age.days).toBe(12);
    expect(age.totalDays).toBeGreaterThan(9000);
  });

  it('13. Fuel Cost: Distance, fuel efficiency, and passenger split', () => {
    // 500 km @ 15 km/l with ₹100/litre petrol for 4 riders, one-way
    const trip = calculateFuelCostPure(500, 15, 100, false, 4);
    expect(trip.fuelLiters).toBeCloseTo(33.33, 1);
    expect(trip.totalCost).toBe(3333);
    expect(trip.costPerPerson).toBe(833);
  });

  it('Registry completeness: all 13 calculators are registered with valid metadata and schemas', () => {
    const all = registry.getAll();
    expect(all.length).toBe(13);
    for (const calc of all) {
      expect(calc.id).toBeTruthy();
      expect(calc.name).toBeTruthy();
      expect(calc.category).toBeTruthy();
      expect(calc.inputSchema).toBeDefined();
      expect(calc.inputs.length).toBeGreaterThan(0);
      expect(typeof calc.calculate).toBe('function');
    }
  });
});
