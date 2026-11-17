import { api } from '@/lib/api/client';
import type { Decimal, Page } from '@/lib/api/types';

export type ReportType =
  'sales' | 'inventory' | 'movements' | 'cash' | 'purchases' | 'expenses';

export interface ReportFilters {
  branchId?: string;
  /** Días completos (AAAA-MM-DD): el backend los interpreta en la zona de la tienda. */
  fromDay?: string;
  toDay?: string;
}

import type { Series } from '@/components/charts/series';

export interface SalesReport {
  daily?: Series;
  byMethod?: Array<{ method: string; total: number }>;
  saleCount: number;
  gross: Decimal;
  discount: Decimal;
  salesTotal: Decimal;
  returnsTotal: Decimal;
  netTax: Decimal;
  netTotal: Decimal;
  netSalesExcludingTax: Decimal;
  averageTicket: Decimal;
  topProducts: Array<{
    variantId: string;
    sku: string;
    name: string;
    grossQuantity: Decimal | null;
    total: Decimal | null;
  }>;
}

export interface InventoryReport {
  items: Array<{
    id: string;
    sku: string | null;
    name: string | null;
    warehouseName: string | null;
    quantity: Decimal;
    value: Decimal;
  }>;
  valuation: Decimal;
  topByValue?: Array<{ sku: string | null; name: string; value: number }>;
  page: number;
  limit: number;
}

export interface MovementRow {
  id: string;
  kind: string;
  reason: string;
  delta: Decimal;
  createdAt: string;
  sku: string | null;
  name: string | null;
  warehouseName: string | null;
  unitCost?: Decimal;
}

export interface CashRow {
  id: string;
  createdAt: string;
  closedAt: string | null;
  opening: Decimal;
  expected: Decimal | null;
  counted: Decimal | null;
  difference: Decimal | null;
}

export interface PurchaseRow {
  id: string;
  createdAt: string;
  purchaseOrderId: string;
  lines: Array<{ lineId: string; quantity: Decimal; unitCost: Decimal }>;
  total: Decimal;
}

export interface ExpenseReport {
  byCategory?: Array<{ category: string; total: number }>;
  items: Array<{
    id: string;
    occurredAt: string;
    description: string;
    categoryId: string;
    amount: Decimal;
  }>;
  total: Decimal;
  page: number;
  limit: number;
}

const base = (o: string) => `/organizations/${o}/reports`;

export const reportKey = (o: string, type: ReportType, params: unknown) =>
  ['organizations', o, 'reports', type, params] as const;

export function fetchReport<T>(
  o: string,
  type: ReportType,
  params: ReportFilters & { page?: number; limit?: number },
  signal?: AbortSignal,
) {
  return api.get<T>(`${base(o)}/${type}`, { query: { ...params }, signal });
}

export const fetchPagedReport = <T>(
  o: string,
  type: ReportType,
  params: ReportFilters & { page?: number; limit?: number },
  signal?: AbortSignal,
) => fetchReport<Page<T>>(o, type, params, signal);

/** URL de exportación (CSV o Excel) en el BFF: el navegador descarga con la cookie de sesión. */
export function exportUrl(
  o: string,
  type: ReportType,
  filters: ReportFilters,
  format: 'csv' | 'xlsx',
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  const text = params.toString();
  return `/api/bff${base(o)}/${type}/${format}${text ? `?${text}` : ''}`;
}
