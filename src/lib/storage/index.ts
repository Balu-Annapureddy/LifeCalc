export interface SavedScenario {
  id: string;
  name: string;
  calculatorId: string;
  primaryResult: string;
  notes?: string;
  updatedAt: string;
  inputs: Record<string, any>;
}

export interface CalculationHistoryItem {
  id: string;
  calculatorId: string;
  summary: string;
  primaryValue: string;
  timestamp: string;
  inputs: Record<string, any>;
}

const STORAGE_KEYS = {
  SAVED: 'lifecalc_saved_v1',
  HISTORY: 'lifecalc_history_v1',
  LEGACY_SAVED: 'lifecalc_saved',
  LEGACY_HISTORY: 'lifecalc_history',
} as const;

const MAX_HISTORY_ITEMS = 50;
const MAX_SAVED_ITEMS = 50;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeGetItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

// ─── Saved Scenarios ─────────────────────────────────────────────────────────

export function getSavedScenarios(): SavedScenario[] {
  const raw = safeGetItem(STORAGE_KEYS.SAVED) || safeGetItem(STORAGE_KEYS.LEGACY_SAVED);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenario(
  item: Omit<SavedScenario, 'id' | 'updatedAt'> & { id?: string }
): SavedScenario {
  const current = getSavedScenarios();
  const id = item.id || `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const scenario: SavedScenario = {
    ...item,
    id,
    updatedAt: dateStr,
  };

  // Replace if existing, or prepend
  const existingIdx = current.findIndex(s => s.id === id);
  let updated: SavedScenario[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = scenario;
  } else {
    updated = [scenario, ...current].slice(0, MAX_SAVED_ITEMS);
  }

  safeSetItem(STORAGE_KEYS.SAVED, JSON.stringify(updated));
  return scenario;
}

export function deleteSavedScenario(id: string): void {
  const current = getSavedScenarios();
  const updated = current.filter(s => s.id !== id);
  safeSetItem(STORAGE_KEYS.SAVED, JSON.stringify(updated));
}

// ─── Calculation History ───────────────────────────────────────────────────

export function getCalculationHistory(): CalculationHistoryItem[] {
  const raw = safeGetItem(STORAGE_KEYS.HISTORY) || safeGetItem(STORAGE_KEYS.LEGACY_HISTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCalculationHistory(
  item: Omit<CalculationHistoryItem, 'id' | 'timestamp'>
): CalculationHistoryItem {
  const current = getCalculationHistory();
  const id = `calc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const historyItem: CalculationHistoryItem = {
    ...item,
    id,
    timestamp,
  };

  // Avoid consecutive exact duplicates for same calculator and inputs
  if (current.length > 0) {
    const latest = current[0];
    if (
      latest.calculatorId === item.calculatorId &&
      JSON.stringify(latest.inputs) === JSON.stringify(item.inputs)
    ) {
      return latest;
    }
  }

  const updated = [historyItem, ...current].slice(0, MAX_HISTORY_ITEMS);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  return historyItem;
}

export function clearCalculationHistory(): void {
  safeRemoveItem(STORAGE_KEYS.HISTORY);
  safeRemoveItem(STORAGE_KEYS.LEGACY_HISTORY);
}

export function deleteHistoryItem(id: string): void {
  const current = getCalculationHistory();
  const updated = current.filter(h => h.id !== id);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}
