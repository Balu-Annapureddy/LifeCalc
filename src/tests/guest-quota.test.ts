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
    const req = new NextRequest('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calculatorId: 'emi',
        inputs: { principal: 1000000, annualRate: 9, tenureYears: 5 },
        authToken: 'valid_user_session_token',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.isGuest).toBe(false);
    expect(data.quotaReached).toBe(false);
    expect(data.calculationsRemaining).toBe(-1);
  });
});
