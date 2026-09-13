import crypto from 'crypto';
import { registry } from '@/engine/registry';
import { getSharedCalculationById, insertSharedCalculation, SharedCalculationRecord } from './db';

export interface VerifiedSharedCalculation {
  id: string;
  calculatorId: string;
  inputs: Record<string, any>;
  createdAt: number;
}

export async function saveSharedCalculation(calculatorId: string, inputs: Record<string, any>): Promise<string> {
  const calc = registry.getById(calculatorId);
  if (!calc) {
    throw new Error(`Invalid calculatorId: ${calculatorId}`);
  }

  // Validate inputs against schema before saving
  const validation = calc.inputSchema.safeParse(inputs);
  if (!validation.success) {
    throw new Error('Invalid calculation inputs');
  }

  // 128 bits of cryptographic unpredictability
  const shareId = crypto.randomBytes(16).toString('hex');
  await insertSharedCalculation(shareId, calculatorId, validation.data);
  return shareId;
}

export async function getSharedCalculation(id: string): Promise<VerifiedSharedCalculation | null> {
  if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{32}$/.test(id)) {
    // Also accept shorter test/legacy IDs if well-formed
    if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
      return null;
    }
  }

  const record = await getSharedCalculationById(id);
  if (!record) return null;

  // Validate calculator still exists
  const calc = registry.getById(record.calculatorId);
  if (!calc) return null;

  // Validate stored inputs
  const validation = calc.inputSchema.safeParse(record.inputs);
  if (!validation.success) return null;

  return {
    id: record.id,
    calculatorId: record.calculatorId,
    inputs: validation.data,
    createdAt: record.createdAt,
  };
}