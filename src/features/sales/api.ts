import { api, newIdempotencyKey } from '@/lib/api/client';
import type { Decimal, ListParams, Page } from '@/lib/api/types';
import type { Sale, VariantHit } from './types';

const base = (o: string) => `/organizations/${o}`;

export const salesKey = (o: string, params?: ListParams) =>
  ['organizations', o, 'sales', params ?? {}] as const;
export const saleKey = (o: string, id: string) =>
  ['organizations', o, 'sale', id] as const;

export const searchVariants = (o: string, q: string, signal?: AbortSignal) =>
  api.get<Page<VariantHit>>(`${base(o)}/variants`, {
    query: { q, limit: 20 },
    signal,
  });

export interface DraftBody {
  warehouseId: string;
  cashSessionId: string;
  customerId?: string;
  lines: Array<{ variantId: string; quantity: string; discountRate: string }>;
}

export const createDraft = (o: string, body: DraftBody) =>
  api.post<Sale>(`${base(o)}/sales`, { body });

export const confirmSale = (
  o: string,
  id: string,
  payments: Array<{ methodId: string; amount: Decimal }>,
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<Sale>(`${base(o)}/sales/${id}/confirm`, {
    body: { payments },
    idempotencyKey,
  });

export const cancelSale = (
  o: string,
  id: string,
  body: {
    reason: string;
    methodId?: string;
    cashSessionId?: string;
    restock?: boolean;
  },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<unknown>(`${base(o)}/sales/${id}/cancel`, { body, idempotencyKey });

export const returnSale = (
  o: string,
  id: string,
  body: {
    methodId: string;
    cashSessionId?: string;
    reason: string;
    lines: Array<{ lineId: string; quantity: string; restock: boolean }>;
  },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<unknown>(`${base(o)}/sales/${id}/returns`, { body, idempotencyKey });

export const fetchSales = (
  o: string,
  params: ListParams & { customerId?: string },
  signal?: AbortSignal,
) => api.get<Page<Sale>>(`${base(o)}/sales`, { query: { ...params }, signal });

export const fetchSale = (o: string, id: string, signal?: AbortSignal) =>
  api.get<Sale>(`${base(o)}/sales/${id}`, { signal });

export const fetchReceipt = (o: string, id: string, signal?: AbortSignal) =>
  api.get<Sale>(`${base(o)}/sales/${id}/receipt`, { signal });
