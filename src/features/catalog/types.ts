import type { Decimal } from '@/lib/api/types';

export interface Product {
  id: string;
  variantId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  unitId: string;
  sku: string;
  barcode: string | null;
  price: Decimal;
  /** Solo lo reciben roles de gestión. */
  cost?: Decimal;
  lowStockThreshold: Decimal;
  archivedAt: string | null;
}

export interface Variant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  isDefault: boolean;
  price: Decimal;
  cost?: Decimal;
  archivedAt: string | null;
}
