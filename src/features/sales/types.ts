import type { Decimal } from '@/lib/api/types';

export type SaleStatus =
  'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'PARTIAL_RETURN' | 'RETURNED';

export interface SaleLine {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  quantity: Decimal;
  returned: Decimal;
  price: Decimal;
  /** Solo lo reciben roles de gestión. */
  cost?: Decimal;
  discountRate: Decimal;
  gross: Decimal;
  discount: Decimal;
  tax: Decimal;
  total: Decimal;
}

export interface SalePayment {
  id: string;
  methodId: string;
  methodName: string;
  isCash: boolean;
  amount: Decimal;
}

export interface Sale {
  id: string;
  branchId: string;
  warehouseId: string;
  cashSessionId: string;
  customerId: string | null;
  actorId: string;
  folio: string | null;
  status: SaleStatus;
  currency: string;
  moneyPrecision: number;
  taxRate: Decimal;
  taxIncluded: boolean;
  gross: Decimal;
  discount: Decimal;
  tax: Decimal;
  total: Decimal;
  change: Decimal;
  storeSnapshot: { name?: string; branch?: string; address?: string | null };
  confirmedAt: string | null;
  createdAt: string;
  lines: SaleLine[];
  payments: SalePayment[];
}

export interface VariantHit {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  isDefault: boolean;
  price: Decimal;
  product: { name: string; unitId: string };
}

export const variantLabel = (v: VariantHit): string =>
  v.isDefault ? v.product.name : `${v.product.name} - ${v.name}`;

export const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Anulada',
  PARTIAL_RETURN: 'Devolución parcial',
  RETURNED: 'Devuelta',
};
