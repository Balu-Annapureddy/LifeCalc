import { describe, it, expect } from 'vitest';
import { POST, GET } from '../app/api/calculate/route';
import { NextRequest } from 'next/server';

describe('Tamper-Proof Guest Quota Suite', () => {
  it('tracks guest usage and enforces 15 calculation limit without destroying results', async () => {
    // Generate a dedicated session cookie for this test run
    const testSid = `test_guest_${Date.now()}`;
    const cookieHeader = `lifecalc_guest_sid=${testSid}`;

    for (let i = 1; i <= 15; i++) {
      const req = new NextRequest('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          calculatorId: 'emi',
          inputs: {
            principal: 1000000,
            annualRate: 9,
            tenureYears: 5,
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Calculation result must ALWAYS be returned (never destroyed or hidden)
      expect(data.result).toBeDefined();
      expect(data.result.primary.value).toBe(20758);
      expect(data.isGuest).toBe(true);
      expect(data.calculationsUsed).toBe(i);
      expect(data.calculationsRemaining).toBe(15 - i);

      if (i < 15) {
        expect(data.quotaReached).toBe(false);
      } else {
        // On 15th calculation:
        expect(data.quotaReached).toBe(true);
        expect(data.calculationsRemaining).toBe(0);
      }
    }

    // 16th calculation attempt
    const req16 = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 500000, annualRate: 8.5, tenureYears: 3 },
      }),
    });

    const res16 = await POST(req16);
    expect(res16.status).toBe(429);
    const data16 = await res16.json();
    expect(data16.error).toBe('Guest calculation limit reached');
    expect(data16.quotaReached).toBe(true);
    expect(data16.calculationsRemaining).toBe(0);
  });

  it('allows unlimited calculations for authenticated users', async () => {
    const { insertUser } = await import('@/lib/db');
    const { createSessionToken } = await import('@/lib/auth');
    await insertUser({
      id: 'test_user_quota_123',
      email: 'quota_tester@lifecalc.in',
      name: 'Quota Tester',
      passwordHash: 'dummy',
      salt: 'dummy',
      createdAt: Date.now(),
    });
    const { token } = await createSessionToken({
      id: 'test_user_quota_123',
      email: 'quota_tester@lifecalc.in',
      name: 'Quota Tester',
      emailVerified: true,
      createdAt: Date.now(),
    });

    const req = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lifecalc_auth_session=${token}`,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 1000000, annualRate: 9, tenureYears: 5 },
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.isGuest).toBe(false);
    expect(data.quotaReached).toBe(false);
    expect(data.calculationsRemaining).toBe(-1);
  });

  it('detects and rejects tampered guest quota cookies', async () => {
    const { signGuestId } = await import('@/lib/guest');
    const validGuestId = 'guest_genuine_1234567890abcdef';
    const validSignedCookie = signGuestId(validGuestId);

    // Tamper with the ID part while leaving signature unchanged
    const tamperedCookie = `guest_forged_9999999999abcdef.${validSignedCookie.split('.')[1]}`;

    const req = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lifecalc_guest_sid=${tamperedCookie}`,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 1000000, annualRate: 9, tenureYears: 5 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Tampered cookie must be discarded; a fresh guest session must be issued in set-cookie
    const setCookie = res.cookies.get('lifecalc_guest_sid')?.value;
    expect(setCookie).toBeTruthy();
    expect(setCookie).not.toBe(tamperedCookie);
    expect(setCookie!.startsWith('guest_')).toBe(true);
  });

  it('GET /api/calculate queries current authoritative quota without incrementing usage count', async () => {
    const testSid = `get_check_guest_${Date.now()}`;
    const cookieHeader = `lifecalc_guest_sid=${testSid}`;

    // Initial check: 15 remaining
    const req1 = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    const res1 = await GET(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.isGuest).toBe(true);
    expect(data1.calculationsUsed).toBe(0);
    expect(data1.calculationsRemaining).toBe(15);
    expect(data1.quotaReached).toBe(false);

    // Consume 1 calculation
    const calcReq = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 100000, annualRate: 10, tenureYears: 1 },
      }),
    });
    const calcRes = await POST(calcReq);
    expect(calcRes.status).toBe(200);
    const calcData = await calcRes.json();
    expect(calcData.calculationsRemaining).toBe(14);

    // GET check must return 14 remaining and NOT increment to 13
    const req2 = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.calculationsUsed).toBe(1);
    expect(data2.calculationsRemaining).toBe(14);

    // Second GET check still returns 14 remaining
    const req3 = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    const res3 = await GET(req3);
    const data3 = await res3.json();
    expect(data3.calculationsRemaining).toBe(14);
  });
});