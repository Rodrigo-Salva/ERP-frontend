import type { Decimal } from '@/lib/api/types';

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  archivedAt: string | null;
}

export type PurchaseStatus =
  'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseLine {
  id: string;
  variantId: string;
  sku: string | null;
  name: string | null;
  quantity: Decimal;
  received: Decimal;
  unitCost: Decimal;
}

export interface PurchaseOrder {
  id: string;
  status: PurchaseStatus;
  notes: string | null;
  branchId: string;
  warehouseId: string;
  supplierId: string;
  supplierName: string | null;
  warehouseName: string | null;
  createdAt: string;
  lines: PurchaseLine[];
}

export const PURCHASE_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PARTIAL: 'Recibida parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};
