import { describe, it, expect } from 'vitest';
import {
  incrementGuestQuotaAtomic,
  recordFailedLogin,
  checkLoginRateLimit,
  getRateLimitRecord,
} from '@/lib/db';

describe('Authoritative Rate Limit & Concurrency Suite', () => {
  it('incrementGuestQuotaAtomic maintains atomic counts correctly', async () => {
    const guestId = `concurrent_guest_${Date.now()}`;

    // Test atomic execution
    const res = await incrementGuestQuotaAtomic(guestId, 100);
    expect(res.allowed).toBe(true);
    expect(res.count).toBe(1);
  });

  it('atomically tracks failed login attempts under 10 concurrent requests without lost updates', async () => {
    const rateLimitKey = `rate_limit_concurrent_${Date.now()}@lifecalc.in`;

    // Launch 10 simultaneous failed login records
    const concurrentFailures = Array.from({ length: 10 }).map(() =>
      recordFailedLogin(rateLimitKey)
    );

    await Promise.all(concurrentFailures);

    // Invariant 1: All 10 failed attempts must be accounted for (no lost updates under concurrency)
    const record = await getRateLimitRecord(rateLimitKey);
    expect(record).not.toBeNull();
    expect(record!.attempts).toBe(10);

    // Invariant 2: Account must be locked
    expect(record!.lockUntil).toBeGreaterThan(Date.now());

    // Invariant 3: checkLoginRateLimit must reject further attempts
    const rateCheck = await checkLoginRateLimit(rateLimitKey);
    expect(rateCheck.allowed).toBe(false);
    expect(rateCheck.waitSeconds).toBeGreaterThan(0);
  });
});
