export interface SharedCalculation {
  calculatorId: string;
  inputs: Record<string, any>;
  createdAt: number;
}

// In-memory shared calculation repository
const sharedCalculations = new Map<string, SharedCalculation>();

export function saveSharedCalculation(calculatorId: string, inputs: Record<string, any>): string {
  const shareId = Math.random().toString(36).substring(2, 10);
  sharedCalculations.set(shareId, {
    calculatorId,
    inputs,
    createdAt: Date.now(),
  });
  return shareId;
}

export function getSharedCalculation(id: string): SharedCalculation | null {
  return sharedCalculations.get(id) || null;
}
