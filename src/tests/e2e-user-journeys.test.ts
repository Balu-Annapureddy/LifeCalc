import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as calculatePost } from '@/app/api/calculate/route';
import { POST as signupPost } from '@/app/api/auth/signup/route';
import { POST as signinPost } from '@/app/api/auth/signin/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { POST as signoutPost } from '@/app/api/auth/signout/route';
import { POST as sharePost, GET as shareGet } from '@/app/api/share/route';
import { POST as savedPost, GET as savedGet, DELETE as savedDelete } from '@/app/api/saved/route';
import { POST as historyPost, GET as historyGet, DELETE as historyDelete } from '@/app/api/history/route';
import { calculateEmiPure } from '@/engine/calculators/money/emi';
import { calculateSipPure } from '@/engine/calculators/money/sip';
import { calculateAttendancePure } from '@/engine/calculators/student/attendance';

describe('LifeCalc Production Security, Auth, & Persistence Journeys', () => {
  it('Journey 1: Guest Quota strictly permits 15 calculations and blocks the 16th with HTTP 429', async () => {
    const sessionId = `guest_test_${Date.now()}`;

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

  it('Journey 2: Real Secure Authentication, Session Validation, Signout & Negative Tests', async () => {
    const testEmail = `sec_user_${Date.now()}@lifecalc.in`;
    const testPassword = 'SecurePassword2026!';
    const testName = 'Security Tester';

    // 1. Password minimum length guard (Reject < 8 chars)
    const shortPassReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: 'short' }),
    });
    const shortPassRes = await signupPost(shortPassReq);
    expect(shortPassRes.status).toBe(400);

    // 2. Unknown user signin must return 401, NOT auto-provision!
    const unknownSigninReq = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `nonexistent_${Date.now()}@lifecalc.in`, password: testPassword }),
    });
    const unknownSigninRes = await signinPost(unknownSigninReq);
    expect(unknownSigninRes.status).toBe(401);

    // 3. Legitimate Sign Up
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
    // Password hash or salt must NEVER be leaked in JSON response
    expect(signupData.user.passwordHash).toBeUndefined();
    expect(signupData.user.salt).toBeUndefined();

    // 4. Duplicate Sign Up rejected
    const dupSignupReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const dupSignupRes = await signupPost(dupSignupReq);
    expect(dupSignupRes.status).toBe(409);

    // 5. Sign In with wrong password rejected
    const wrongPassReq = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    const wrongPassRes = await signinPost(wrongPassReq);
    expect(wrongPassRes.status).toBe(401);

    // 6. Legitimate Sign In
    const signinReq = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const signinRes = await signinPost(signinReq);
    expect(signinRes.status).toBe(200);
    const signinCookie = signinRes.cookies.get('lifecalc_auth_session')?.value;
    expect(signinCookie).toBeTruthy();

    // 7. Verify /api/auth/me
    const meReq = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: { Cookie: `lifecalc_auth_session=${signinCookie}` },
    });
    const meRes = await meGet(meReq);
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.authenticated).toBe(true);
    expect(meData.user.email).toBe(testEmail);

    // 8. Security test: request-body authToken MUST BE IGNORED by /api/calculate
    const fakeAuthReq = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lifecalc_guest_sid=guest_unauthed_attempt_${Date.now()}`,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 100000, annualRate: 10, tenureYears: 1 },
        authToken: 'fake_forged_token_attempt',
      }),
    });
    const fakeAuthRes = await calculatePost(fakeAuthReq);
    const fakeAuthData = await fakeAuthRes.json();
    expect(fakeAuthData.isGuest).toBe(true); // Must remain guest!

    // 9. Legitimate authenticated calculation has unlimited quota
    const authedCalcReq = new NextRequest('http://localhost:3000/api/calculate', {
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
    const authedCalcRes = await calculatePost(authedCalcReq);
    expect(authedCalcRes.status).toBe(200);
    const authedData = await authedCalcRes.json();
    expect(authedData.isGuest).toBe(false);
    expect(authedData.calculationsRemaining).toBe(-1);

    // 10. Logout invalidates session in DB
    const signoutReq = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
      headers: { Cookie: `lifecalc_auth_session=${signinCookie}` },
    });
    const signoutRes = await signoutPost(signoutReq);
    expect(signoutRes.status).toBe(200);

    // Session is now invalidated; me should return unauthenticated
    const postSignoutMeRes = await meGet(meReq);
    const postSignoutMeData = await postSignoutMeRes.json();
    expect(postSignoutMeData.authenticated).toBe(false);
  });

  it('Journey 3: Scenario Persistence & Strict IDOR Protection', async () => {
    // User A creates a scenario
    const userASession = `user_a_sess_${Date.now()}`;
    const cookieHeaderA = `lifecalc_guest_sid=${userASession}`;

    const saveReqA = new NextRequest('http://localhost:3000/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeaderA },
      body: JSON.stringify({
        name: "User A's Home Loan",
        calculatorId: 'emi',
        primaryResult: '₹43,391 / mo',
        notes: 'User A confidential note',
        inputs: { principal: 5000000, annualRate: 8.5, tenureYears: 20 },
      }),
    });
    const saveResA = await savedPost(saveReqA);
    expect(saveResA.status).toBe(200);
    const savedDataA = await saveResA.json();
    const scenarioIdA = savedDataA.item.id;

    // User B attempts to read User A's scenarios
    const userBSession = `user_b_sess_${Date.now()}`;
    const cookieHeaderB = `lifecalc_guest_sid=${userBSession}`;

    const getReqB = new NextRequest('http://localhost:3000/api/saved', {
      method: 'GET',
      headers: { Cookie: cookieHeaderB },
    });
    const getResB = await savedGet(getReqB);
    const dataB = await getResB.json();
    // User B must NOT see User A's scenarios
    expect(dataB.items.find((s: any) => s.id === scenarioIdA)).toBeUndefined();

    // User B attempts IDOR delete on User A's scenario
    const idorDeleteReq = new NextRequest(`http://localhost:3000/api/saved?id=${scenarioIdA}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeaderB },
    });
    const idorDeleteRes = await savedDelete(idorDeleteReq);
    const idorData = await idorDeleteRes.json();
    expect(idorData.deleted).toBe(false); // IDOR thwarted!

    // Verify User A's scenario is still intact
    const getReqA = new NextRequest('http://localhost:3000/api/saved', {
      method: 'GET',
      headers: { Cookie: cookieHeaderA },
    });
    const getResA = await savedGet(getReqA);
    const dataA = await getResA.json();
    expect(dataA.items.find((s: any) => s.id === scenarioIdA)).toBeDefined();

    // User A can legitimately delete their own scenario
    const legitDeleteReq = new NextRequest(`http://localhost:3000/api/saved?id=${scenarioIdA}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeaderA },
    });
    const legitDeleteRes = await savedDelete(legitDeleteReq);
    const legitDeleteData = await legitDeleteRes.json();
    expect(legitDeleteData.deleted).toBe(true);
  });

  it('Journey 4: Cryptographically Unpredictable Share Links & Schema Validation', async () => {
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
    // 128-bit hex string has length 32
    expect(shareData.shareId.length).toBe(32);
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

    // Negative test: invalid share id returns 404
    const badShareGetReq = new NextRequest('http://localhost:3000/api/share?id=00000000000000000000000000000000', {
      method: 'GET',
    });
    const badShareGetRes = await shareGet(badShareGetReq);
    expect(badShareGetRes.status).toBe(404);
  });
});
