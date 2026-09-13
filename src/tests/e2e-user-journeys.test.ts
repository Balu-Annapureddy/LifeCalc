import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as calculatePost } from '@/app/api/calculate/route';
import { POST as signupPost } from '@/app/api/auth/signup/route';
import { POST as signinPost } from '@/app/api/auth/signin/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { POST as sharePost, GET as shareGet } from '@/app/api/share/route';
import { POST as savedPost, GET as savedGet, DELETE as savedDelete } from '@/app/api/saved/route';
import { calculateEmiPure } from '@/engine/calculators/money/emi';
import { calculateSipPure } from '@/engine/calculators/money/sip';
import { calculateAttendancePure } from '@/engine/calculators/student/attendance';

describe('LifeCalc Production User Journeys & Stabilization Verification', () => {
  it('Journey 1: Guest Quota strictly permits 15 calculations and blocks the 16th with HTTP 429', async () => {
    const sessionId = `e2e_guest_${Date.now()}`;

    for (let i = 1; i <= 15; i++) {
      const req = new NextRequest('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `lifecalc_guest_sid=${sessionId}`,
        },
        body: JSON.stringify({
          calculatorId: 'emi',
          inputs: { principal: 100000, annualRate: 10, tenureYears: 1 },
        }),
      });

      const res = await calculatePost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isGuest).toBe(true);
      expect(data.calculationsUsed).toBe(i);
      expect(data.calculationsRemaining).toBe(15 - i);
      expect(data.quotaReached).toBe(i === 15);
      expect(data.result.primary.value).toBeGreaterThan(0);
    }

    // 16th attempt should return HTTP 429
    const blockedReq = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lifecalc_guest_sid=${sessionId}`,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 100000, annualRate: 10, tenureYears: 1 },
      }),
    });

    const blockedRes = await calculatePost(blockedReq);
    expect(blockedRes.status).toBe(429);
    const blockedData = await blockedRes.json();
    expect(blockedData.quotaReached).toBe(true);
    expect(blockedData.calculationsRemaining).toBe(0);
  });

  it('Journey 2: User Sign Up, Sign In, and Unlimited Calculations under Authenticated Session', async () => {
    const testEmail = `user_${Date.now()}@lifecalc.in`;
    const testPassword = 'Password123!';
    const testName = 'Alex Test';

    // 1. Sign Up
    const signupReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const signupRes = await signupPost(signupReq);
    expect(signupRes.status).toBe(200);
    const signupData = await signupRes.json();
    expect(signupData.success).toBe(true);
    expect(signupData.user.email).toBe(testEmail);

    // Check cookie
    const setCookie = signupRes.cookies.get('lifecalc_auth_session')?.value;
    expect(setCookie).toBeTruthy();

    // 2. Sign In
    const signinReq = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const signinRes = await signinPost(signinReq);
    expect(signinRes.status).toBe(200);
    const signinCookie = signinRes.cookies.get('lifecalc_auth_session')?.value;
    expect(signinCookie).toBeTruthy();

    // 3. Check /api/auth/me
    const meReq = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: { Cookie: `lifecalc_auth_session=${signinCookie}` },
    });
    const meRes = await meGet(meReq);
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.authenticated).toBe(true);
    expect(meData.user.email).toBe(testEmail);

    // 4. Authenticated calculation has unlimited quota (isGuest: false)
    const calcReq = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lifecalc_auth_session=${signinCookie}`,
      },
      body: JSON.stringify({
        calculatorId: 'sip',
        inputs: { monthlyInvestment: 5000, expectedReturnRate: 12, investmentPeriodYears: 10 },
      }),
    });
    const calcRes = await calculatePost(calcReq);
    expect(calcRes.status).toBe(200);
    const calcData = await calcRes.json();
    expect(calcData.isGuest).toBe(false);
    expect(calcData.calculationsRemaining).toBe(-1);
  });

  it('Journey 3: Scenario Persistence (Save, Retrieve, and Delete via /api/saved)', async () => {
    const userSession = `sess_${Date.now()}`;
    const cookieHeader = `lifecalc_guest_session=${userSession}`;

    // 1. Save scenario
    const saveReq = new NextRequest('http://localhost:3000/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        name: 'Home Loan Scenario 1',
        calculatorId: 'emi',
        primaryResult: '₹43,391 / mo',
        notes: 'SBI Maxgain',
        inputs: { principal: 5000000, annualRate: 8.5, tenureYears: 20 },
      }),
    });
    const saveRes = await savedPost(saveReq);
    expect(saveRes.status).toBe(200);
    const savedBody = await saveRes.json();
    expect(savedBody.success).toBe(true);
    const savedId = savedBody.item.id;
    expect(savedId).toBeTruthy();

    // 2. Retrieve saved scenarios
    const getReq = new NextRequest('http://localhost:3000/api/saved', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    const getRes = await savedGet(getReq);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.items.length).toBeGreaterThanOrEqual(1);
    expect(getBody.items[0].name).toBe('Home Loan Scenario 1');

    // 3. Delete saved scenario
    const delReq = new NextRequest(`http://localhost:3000/api/saved?id=${savedId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    const delRes = await savedDelete(delReq);
    expect(delRes.status).toBe(200);
  });

  it('Journey 4: End-to-End Share Creation and Fetching via /api/share', async () => {
    const payload = {
      calculatorId: 'can-i-afford-this',
      inputs: { monthlyIncome: 90000, monthlyExpenses: 30000, itemPrice: 150000, paymentMode: 'cash' },
    };

    const sharePostReq = new NextRequest('http://localhost:3000/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const sharePostRes = await sharePost(sharePostReq);
    expect(sharePostRes.status).toBe(200);
    const shareData = await sharePostRes.json();
    expect(shareData.shareId).toBeTruthy();
    expect(shareData.shareUrl).toBe(`/share/${shareData.shareId}`);

    // Retrieve shared data
    const shareGetReq = new NextRequest(`http://localhost:3000/api/share?id=${shareData.shareId}`, {
      method: 'GET',
    });
    const shareGetRes = await shareGet(shareGetReq);
    expect(shareGetRes.status).toBe(200);
    const retrievedData = await shareGetRes.json();
    expect(retrievedData.calculatorId).toBe('can-i-afford-this');
    expect(retrievedData.inputs.itemPrice).toBe(150000);
  });

  it('Journey 5: Mathematical Edge Case Hardening', () => {
    // EMI 0% interest
    const emiZeroRate = calculateEmiPure(120000, 0, 1);
    expect(emiZeroRate.emi).toBe(10000);
    expect(emiZeroRate.totalInterest).toBe(0);
    expect(emiZeroRate.totalPayment).toBe(120000);
    expect(emiZeroRate.principalRatio).toBe(100);
    expect(emiZeroRate.interestRatio).toBe(0);

    // SIP 0% return rate
    const sipZeroReturn = calculateSipPure(1000, 0, 1);
    expect(sipZeroReturn.totalInvested).toBe(12000);
    expect(sipZeroReturn.futureValue).toBe(12000);
    expect(sipZeroReturn.wealthGain).toBe(0);
    expect(sipZeroReturn.wealthRatio).toBe(0);
    expect(sipZeroReturn.investedRatio).toBe(100);

    // Attendance 0 total classes
    const attZero = calculateAttendancePure(0, 0, 75);
    expect(attZero.currentPercentage).toBe(0);
    expect(attZero.isEligible).toBe(false);
    expect(attZero.classesNeeded).toBe(0);
  });
});
