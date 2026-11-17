import { api, newIdempotencyKey } from '@/lib/api/client';
import type { ListParams, Page } from '@/lib/api/types';
import type { Balance, LowStockItem, Movement, Transfer } from './types';

const base = (o: string) => `/organizations/${o}/inventory`;

export const inventoryPrefix = (o: string) =>
  ['organizations', o, 'inventory'] as const;
export const inventoryKey = (o: string, resource: string, params?: unknown) =>
  [...inventoryPrefix(o), resource, params ?? {}] as const;

export const fetchBalances = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Balance>>(`${base(o)}/balances`, {
    query: { ...params },
    signal,
  });

export const fetchMovements = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Movement>>(`${base(o)}/movements`, {
    query: { ...params },
    signal,
  });

export const fetchLowStock = (
  o: string,
  warehouseId: string,
  signal?: AbortSignal,
) =>
  api.get<LowStockItem[]>(`${base(o)}/low-stock`, {
    query: { warehouseId },
    signal,
  });

export const fetchTransfers = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Transfer>>(`${base(o)}/transfers`, {
    query: { ...params },
    signal,
  });

export const adjustStock = (
  o: string,
  body: {
    warehouseId: string;
    variantId: string;
    delta: string;
    unitCost?: string;
    reason: string;
  },
  idempotencyKey = newIdempotencyKey(),
) => api.post<unknown>(`${base(o)}/adjustments`, { body, idempotencyKey });

export const createTransfer = (
  o: string,
  body: {
    sourceWarehouseId: string;
    targetWarehouseId: string;
    reason: string;
    lines: Array<{ variantId: string; quantity: string }>;
  },
) => api.post<Transfer>(`${base(o)}/transfers`, { body });

export const transitionTransfer = (
  o: string,
  id: string,
  action: 'send' | 'receive' | 'cancel',
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<Transfer>(`${base(o)}/transfers/${id}/${action}`, {
    body: {},
    idempotencyKey,
  });
