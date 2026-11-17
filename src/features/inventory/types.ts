import type { Decimal } from '@/lib/api/types';

export interface Balance {
  id: string;
  branchId: string;
  warehouseId: string;
  variantId: string;
  quantity: Decimal;
  /** Solo roles de gestión. */
  value?: Decimal;
  sku: string | null;
  name: string | null;
  warehouseName: string | null;
}

export interface Movement {
  id: string;
  kind: string;
  referenceId: string;
  reason: string;
  delta: Decimal;
  before: Decimal;
  after: Decimal;
  unitCost?: Decimal;
  valueDelta?: Decimal;
  createdAt: string;
  sku: string | null;
  name: string | null;
  warehouseName: string | null;
}

export interface LowStockItem {
  variantId: string;
  sku: string;
  name: string;
  quantity: Decimal;
  threshold: Decimal;
}

export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface Transfer {
  id: string;
  status: TransferStatus;
  reason: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  sourceWarehouseName: string | null;
  targetWarehouseName: string | null;
  createdAt: string;
  lines: Array<{
    variantId: string;
    quantity: Decimal;
    sku: string | null;
    name: string | null;
  }>;
}

export { MOVEMENT_KINDS } from '@/lib/movement-kinds';

export const TRANSFER_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Borrador',
  IN_TRANSIT: 'En tránsito',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};
