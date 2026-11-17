import { api, newIdempotencyKey } from '@/lib/api/client';
import type { ListParams, Page } from '@/lib/api/types';
import type { PurchaseOrder, Supplier } from './types';

const base = (o: string) => `/organizations/${o}`;

export const purchasesPrefix = (o: string) =>
  ['organizations', o, 'purchases'] as const;
export const suppliersKey = (o: string, params?: unknown) =>
  [...purchasesPrefix(o), 'suppliers', params ?? {}] as const;
export const ordersKey = (o: string, params?: unknown) =>
  [...purchasesPrefix(o), 'orders', params ?? {}] as const;

export const fetchSuppliers = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Supplier>>(`${base(o)}/suppliers`, {
    query: { ...params },
    signal,
  });

export interface SupplierBody {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  archived?: boolean;
}

export const saveSupplier = (o: string, body: SupplierBody, id?: string) =>
  id
    ? api.patch<Supplier>(`${base(o)}/suppliers/${id}`, { body })
    : api.post<Supplier>(`${base(o)}/suppliers`, { body });

export const fetchOrders = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<PurchaseOrder>>(`${base(o)}/purchase-orders`, {
    query: { ...params },
    signal,
  });

export const createOrder = (
  o: string,
  body: {
    warehouseId: string;
    supplierId: string;
    notes?: string;
    lines: Array<{ variantId: string; quantity: string; unitCost: string }>;
  },
) => api.post<PurchaseOrder>(`${base(o)}/purchase-orders`, { body });

export const transitionOrder = (
  o: string,
  id: string,
  action: 'send' | 'cancel',
) =>
  api.post<PurchaseOrder>(`${base(o)}/purchase-orders/${id}/${action}`, {
    body: {},
  });

export const receiveOrder = (
  o: string,
  id: string,
  body: {
    lines: Array<{ lineId: string; quantity: string; unitCost: string }>;
  },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<unknown>(`${base(o)}/purchase-orders/${id}/receipts`, {
    body,
    idempotencyKey,
  });
