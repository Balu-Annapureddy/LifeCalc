import { describe, it, expect } from 'vitest';
import { POST, GET } from '../app/api/calculate/route';
import { NextRequest } from 'next/server';

describe('LifeCalc Unmetered Guest Calculation Suite', () => {
  it('freely allows guests to execute calculations without a 15-calculation quota', async () => {
    const testSid = `test_guest_${Date.now()}`;
    const cookieHeader = `lifecalc_guest_sid=${testSid}`;

    // Perform 20 calculations — none should be blocked by a quota or HTTP 429
    for (let i = 1; i <= 20; i++) {
      const req = new NextRequest('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          calculatorId: 'emi',
          inputs: {
            principal: 1000000 + i * 10000,
            annualRate: 9,
            tenureYears: 5,
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Calculation result must ALWAYS be returned
      expect(data.result).toBeDefined();
      expect(data.result.primary.value).toBeGreaterThan(0);
      expect(data.isGuest).toBe(true);
      // No quota blocking fields
      expect(data.quotaReached).toBeUndefined();
      expect(data.calculationsRemaining).toBeUndefined();
    }
  });

  it('allows authenticated users to execute calculations normally', async () => {
    const { insertUser } = await import('@/lib/db');
    const { createSessionToken } = await import('@/lib/auth');
    await insertUser({
      id: 'test_user_calc_123',
      email: 'calc_tester@lifecalc.in',
      name: 'Calc Tester',
      passwordHash: 'dummy',
      salt: 'dummy',
      createdAt: Date.now(),
    });
    const { token } = await createSessionToken({
      id: 'test_user_calc_123',
      email: 'calc_tester@lifecalc.in',
      name: 'Calc Tester',
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
    expect(data.result.primary.value).toBe(20758);
  });

  it('detects and safely resets tampered guest cookies', async () => {
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

  it('GET /api/calculate queries status without quota limits', async () => {
    const testSid = `get_check_guest_${Date.now()}`;
    const cookieHeader = `lifecalc_guest_sid=${testSid}`;

    const req1 = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    const res1 = await GET(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.isGuest).toBe(true);
    expect(data1.guestId).toBeDefined();
  });
});
