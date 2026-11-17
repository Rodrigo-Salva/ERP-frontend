import { api, newIdempotencyKey } from '@/lib/api/client';
import type { Decimal, ListParams, Page } from '@/lib/api/types';
import { cashKeys, type CashSession } from '@/lib/queries/cash';
import type { CashMovement, CashSessionDetail, Expense } from './types';

const base = (o: string) => `/organizations/${o}`;

export const sessionsKey = (o: string, params: ListParams) =>
  [...cashKeys.all(o), 'sessions', params] as const;
export const sessionKey = (o: string, id: string) =>
  [...cashKeys.all(o), 'session', id] as const;
export const expensesKey = (o: string, params: ListParams) =>
  ['organizations', o, 'expenses', params] as const;

export const fetchSessions = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<CashSession>>(`${base(o)}/cash-sessions`, {
    query: { ...params },
    signal,
  });

export const fetchSession = (o: string, id: string, signal?: AbortSignal) =>
  api.get<CashSessionDetail>(`${base(o)}/cash-sessions/${id}`, { signal });

export const openSession = (
  o: string,
  body: { cashRegisterId: string; opening: Decimal },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<CashSession>(`${base(o)}/cash-sessions`, { body, idempotencyKey });

export const closeSession = (
  o: string,
  id: string,
  body: { counted: Decimal },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<CashSession>(`${base(o)}/cash-sessions/${id}/close`, {
    body,
    idempotencyKey,
  });

export const addMovement = (
  o: string,
  id: string,
  body: { direction: 'IN' | 'OUT'; amount: Decimal; reason: string },
  idempotencyKey = newIdempotencyKey(),
) =>
  api.post<CashMovement>(`${base(o)}/cash-sessions/${id}/movements`, {
    body,
    idempotencyKey,
  });

export const fetchExpenses = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Expense>>(`${base(o)}/expenses`, {
    query: { ...params },
    signal,
  });

export const createExpense = (
  o: string,
  body: {
    branchId: string;
    categoryId: string;
    cashSessionId?: string;
    amount: Decimal;
    description: string;
    occurredAt: string;
  },
  idempotencyKey = newIdempotencyKey(),
) => api.post<Expense>(`${base(o)}/expenses`, { body, idempotencyKey });
