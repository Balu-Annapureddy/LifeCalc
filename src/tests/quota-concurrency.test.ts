import { describe, it, expect } from 'vitest';
import { incrementGuestQuotaAtomic, _resetDatabaseForTesting } from '@/lib/db';

describe('Authoritative Atomic Guest Quota Concurrency Suite', () => {
  it('strictly enforces calculation limit <= 15 under 10 concurrent requests at boundary 14', async () => {
    _resetDatabaseForTesting();
    const guestId = `concurrent_guest_${Date.now()}`;

    // 1. Advance quota to 14
    for (let i = 1; i <= 14; i++) {
      const res = await incrementGuestQuotaAtomic(guestId, 15);
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(i);
    }

    // 2. Launch 10 simultaneous concurrent calculation requests at the limit threshold
    const concurrentRequests = Array.from({ length: 10 }).map(() =>
      incrementGuestQuotaAtomic(guestId, 15)
    );

    const results = await Promise.all(concurrentRequests);

    // Invariant: Exactly ONE request must succeed (the 15th calculation)
    const allowedResults = results.filter(r => r.allowed);
    const rejectedResults = results.filter(r => !r.allowed);

    expect(allowedResults.length).toBe(1);
    expect(allowedResults[0].count).toBe(15);
    expect(rejectedResults.length).toBe(9);

    // Invariant: Final quota must never exceed 15
    for (const rej of rejectedResults) {
      expect(rej.count).toBe(15);
    }

    // Subsequent single request must also be rejected
    const nextAttempt = await incrementGuestQuotaAtomic(guestId, 15);
    expect(nextAttempt.allowed).toBe(false);
    expect(nextAttempt.count).toBe(15);
  });
});