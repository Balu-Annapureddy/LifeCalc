import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGuestUsageState,
  recordMeaningfulUsage,
  dismissAccountPrompt,
  clearGuestPromptOnAuth,
  GUEST_USAGE_CONFIG,
} from '@/lib/guestUsage';

// In-memory mock for localStorage in node test environment
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  };
});

describe('Guest Meaningful Usage & Account Nudge Suite', () => {
  it('1. Initial state starts with 0 usages and no prompts', () => {
    const state = getGuestUsageState();
    expect(state.meaningfulUsageCount).toBe(0);
    expect(state.lastPromptedAtCount).toBe(0);
    expect(state.dismissedCount).toBe(0);
  });

  it('2. Multiple input modifications within the same calculator session count as ONE usage', () => {
    // First interaction with 'emi'
    const first = recordMeaningfulUsage('emi', false);
    expect(first.currentCount).toBe(1);
    expect(first.shouldPrompt).toBe(false);

    // Multiple subsequent changes within 5 minutes on the same calculator 'emi'
    const change2 = recordMeaningfulUsage('emi', false);
    const change3 = recordMeaningfulUsage('emi', false);
    const change4 = recordMeaningfulUsage('emi', false);

    expect(change2.currentCount).toBe(1);
    expect(change3.currentCount).toBe(1);
    expect(change4.currentCount).toBe(1);
    expect(change4.shouldPrompt).toBe(false);

    const state = getGuestUsageState();
    expect(state.meaningfulUsageCount).toBe(1);
  });

  it('3. Interacting with different calculators increments meaningful session count', () => {
    recordMeaningfulUsage('emi', false);
    const calc2 = recordMeaningfulUsage('sip', false);
    const calc3 = recordMeaningfulUsage('ctc-to-take-home', false);
    const calc4 = recordMeaningfulUsage('fuel-cost', false);

    expect(calc2.currentCount).toBe(2);
    expect(calc3.currentCount).toBe(3);
    expect(calc4.currentCount).toBe(4);
    expect(calc4.shouldPrompt).toBe(false);

    // 5th meaningful usage triggers prompt at configurable threshold (5)
    const calc5 = recordMeaningfulUsage('discount', false);
    expect(calc5.currentCount).toBe(5);
    expect(calc5.shouldPrompt).toBe(true);
  });

  it('4. Dismissing prompt allows continued usage without immediate re-prompt', () => {
    // Reach 5 usages
    ['emi', 'sip', 'ctc-to-take-home', 'fuel-cost', 'discount'].forEach(id => {
      recordMeaningfulUsage(id, false);
    });

    const stateAt5 = getGuestUsageState();
    expect(stateAt5.meaningfulUsageCount).toBe(5);
    expect(stateAt5.lastPromptedAtCount).toBe(5);

    // User dismisses prompt ("Continue as guest")
    dismissAccountPrompt();
    const stateAfterDismiss = getGuestUsageState();
    expect(stateAfterDismiss.dismissedCount).toBe(1);

    // 6th, 7th, 8th, 9th usages do NOT prompt again
    const calc6 = recordMeaningfulUsage('attendance', false);
    const calc7 = recordMeaningfulUsage('cgpa', false);
    const calc8 = recordMeaningfulUsage('age', false);
    const calc9 = recordMeaningfulUsage('gst', false);

    expect(calc6.shouldPrompt).toBe(false);
    expect(calc7.shouldPrompt).toBe(false);
    expect(calc8.shouldPrompt).toBe(false);
    expect(calc9.shouldPrompt).toBe(false);
  });

  it('5. Prompts again after the NEXT threshold interval (10, 15, etc.)', () => {
    // 1 to 5: prompt 1
    ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(id => recordMeaningfulUsage(id, false));
    dismissAccountPrompt();

    // 6 to 9: no prompt
    ['c6', 'c7', 'c8', 'c9'].forEach(id => {
      const res = recordMeaningfulUsage(id, false);
      expect(res.shouldPrompt).toBe(false);
    });

    // 10th meaningful usage: triggers prompt 2!
    const calc10 = recordMeaningfulUsage('c10', false);
    expect(calc10.currentCount).toBe(10);
    expect(calc10.shouldPrompt).toBe(true);

    dismissAccountPrompt();

    // 11 to 14: no prompt
    ['c11', 'c12', 'c13', 'c14'].forEach(id => {
      const res = recordMeaningfulUsage(id, false);
      expect(res.shouldPrompt).toBe(false);
    });

    // 15th meaningful usage: triggers prompt 3!
    const calc15 = recordMeaningfulUsage('c15', false);
    expect(calc15.currentCount).toBe(15);
    expect(calc15.shouldPrompt).toBe(true);
  });

  it('6. Authenticated users NEVER trigger guest account prompts or count', () => {
    for (let i = 1; i <= 20; i++) {
      const res = recordMeaningfulUsage(`calc_${i}`, true); // isAuthenticated = true
      expect(res.shouldPrompt).toBe(false);
      expect(res.currentCount).toBe(0);
    }

    const state = getGuestUsageState();
    expect(state.meaningfulUsageCount).toBe(0);
  });

  it('7. Page refresh preserves engagement count and prompt state', () => {
    // Usage 1, 2, 3
    recordMeaningfulUsage('emi', false);
    recordMeaningfulUsage('sip', false);
    recordMeaningfulUsage('discount', false);

    // Read stored JSON
    const stored = JSON.parse(mockStorage[GUEST_USAGE_CONFIG.STORAGE_KEY]);
    expect(stored.meaningfulUsageCount).toBe(3);

    // Continue on fresh load
    const next = recordMeaningfulUsage('attendance', false);
    expect(next.currentCount).toBe(4);
  });

  it('8. Signing in / signing up clears guest prompt tracking', () => {
    recordMeaningfulUsage('emi', false);
    recordMeaningfulUsage('sip', false);
    expect(getGuestUsageState().meaningfulUsageCount).toBe(2);

    clearGuestPromptOnAuth();
    expect(mockStorage[GUEST_USAGE_CONFIG.STORAGE_KEY]).toBeUndefined();
  });
});
