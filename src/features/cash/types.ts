import type { Decimal } from '@/lib/api/types';
import type { CashSession } from '@/lib/queries/cash';

export interface CashMovement {
  id: string;
  cashSessionId: string;
  actorId: string;
  amount: Decimal;
  kind: 'SALE' | 'REFUND' | 'EXPENSE' | 'MANUAL' | string;
  reason: string;
  referenceId: string;
  createdAt: string;
}

export interface CashSessionDetail extends CashSession {
  currentExpected: Decimal;
  movements: CashMovement[];
}

export interface Expense {
  id: string;
  branchId: string;
  categoryId: string;
  cashSessionId: string | null;
  amount: Decimal;
  description: string;
  occurredAt: string;
  createdAt: string;
}

export const MOVEMENT_LABELS: Record<string, string> = {
  SALE: 'Cobro de venta',
  REFUND: 'Reembolso',
  EXPENSE: 'Gasto',
  MANUAL: 'Movimiento manual',
};
