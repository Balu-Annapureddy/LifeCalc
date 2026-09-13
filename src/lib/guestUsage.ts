/**
 * LifeCalc — Guest Usage & Account Nudge Tracking
 * 
 * Tracks genuine calculator engagement without counting individual keystrokes,
 * React renders, chart redraws, or field validations.
 * Multiple input adjustments within the same calculator session count as ONE usage.
 */

export interface GuestUsageState {
  meaningfulUsageCount: number;
  lastPromptedAtCount: number;
  dismissedCount: number;
  lastActiveCalculatorId?: string;
  lastActiveSessionTimestamp?: number;
}

export const GUEST_USAGE_CONFIG = {
  PROMPT_THRESHOLD_INTERVAL: 5, // Prompt at 5, 10, 15, 20...
  SESSION_IDLE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes to treat as fresh session
  MIN_SETTLE_DELAY_MS: 1500, // User settled on inputs for at least 1.5s
  STORAGE_KEY: 'lifecalc_guest_engagement',
};

export function getGuestUsageState(): GuestUsageState {
  if (typeof window === 'undefined') {
    return {
      meaningfulUsageCount: 0,
      lastPromptedAtCount: 0,
      dismissedCount: 0,
    };
  }

  try {
    const raw = localStorage.getItem(GUEST_USAGE_CONFIG.STORAGE_KEY);
    if (!raw) {
      return {
        meaningfulUsageCount: 0,
        lastPromptedAtCount: 0,
        dismissedCount: 0,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      meaningfulUsageCount: 0,
      lastPromptedAtCount: 0,
      dismissedCount: 0,
    };
  }
}

export function saveGuestUsageState(state: GuestUsageState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_USAGE_CONFIG.STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Records a meaningful calculator usage.
 * Returns true if the guest should be prompted to create an account.
 */
export function recordMeaningfulUsage(
  calculatorId: string,
  isAuthenticated: boolean,
  thresholdInterval = GUEST_USAGE_CONFIG.PROMPT_THRESHOLD_INTERVAL
): { shouldPrompt: boolean; currentCount: number } {
  // If user is already authenticated, never prompt or count for guest nudges
  if (isAuthenticated || typeof window === 'undefined') {
    return { shouldPrompt: false, currentCount: 0 };
  }

  const state = getGuestUsageState();
  const now = Date.now();

  // Check if this is continuing an ongoing session on the same calculator
  const isSameCalculator = state.lastActiveCalculatorId === calculatorId;
  const isWithinSession =
    state.lastActiveSessionTimestamp &&
    now - state.lastActiveSessionTimestamp < GUEST_USAGE_CONFIG.SESSION_IDLE_TIMEOUT_MS;

  if (isSameCalculator && isWithinSession) {
    // Update timestamp without incrementing count (multiple edits count as ONE session usage)
    state.lastActiveSessionTimestamp = now;
    saveGuestUsageState(state);
    return {
      shouldPrompt: false,
      currentCount: state.meaningfulUsageCount,
    };
  }

  // Brand new calculator interaction session
  state.meaningfulUsageCount += 1;
  state.lastActiveCalculatorId = calculatorId;
  state.lastActiveSessionTimestamp = now;

  // Check if current count reached the next prompt milestone
  const countSinceLastPrompt = state.meaningfulUsageCount - state.lastPromptedAtCount;
  let shouldPrompt = false;

  if (state.meaningfulUsageCount >= thresholdInterval && countSinceLastPrompt >= thresholdInterval) {
    shouldPrompt = true;
    state.lastPromptedAtCount = state.meaningfulUsageCount;
  }

  saveGuestUsageState(state);
  return {
    shouldPrompt,
    currentCount: state.meaningfulUsageCount,
  };
}

/**
 * Dismisses the prompt and records dismiss count.
 */
export function dismissAccountPrompt(): void {
  const state = getGuestUsageState();
  state.dismissedCount += 1;
  // Ensure lastPromptedAtCount is synced to current count so prompt only shows after another threshold
  state.lastPromptedAtCount = state.meaningfulUsageCount;
  saveGuestUsageState(state);
}

/**
 * Clears guest prompt state when a user signs in or signs up.
 */
export function clearGuestPromptOnAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_USAGE_CONFIG.STORAGE_KEY);
  } catch {}
}
