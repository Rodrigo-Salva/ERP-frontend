import { api } from '@/lib/api/client';
import { fetchAllPages } from '@/lib/api/paging';
import type {
  ExpenseCategory,
  ListParams,
  Page,
  PaymentMethod,
  Role,
  Warehouse,
} from '@/lib/api/types';
import type { Invitation, Member, OrganizationSettings } from './types';

const base = (o: string) => `/organizations/${o}`;

export const settingsPrefix = (o: string) =>
  ['organizations', o, 'settings'] as const;
export const settingsKey = (o: string, part: string, params?: unknown) =>
  [...settingsPrefix(o), part, params ?? {}] as const;

export const fetchSettings = (o: string, signal?: AbortSignal) =>
  api.get<OrganizationSettings>(`${base(o)}/settings`, { signal });

export const updateSettings = (o: string, body: Record<string, unknown>) =>
  api.patch<OrganizationSettings>(`${base(o)}/settings`, { body });

export const saveBranch = (
  o: string,
  body: Record<string, unknown>,
  id?: string,
) =>
  id
    ? api.patch<unknown>(`${base(o)}/branches/${id}`, { body })
    : api.post<unknown>(`${base(o)}/branches`, { body });

export const createWarehouse = (
  o: string,
  body: { branchId: string; name: string; code: string },
) => api.post<Warehouse>(`${base(o)}/warehouses`, { body });

export const fetchWarehouses = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<Warehouse>>(`${base(o)}/warehouses`, {
    query: { ...params },
    signal,
  });

export const fetchPaymentMethods = (o: string, signal?: AbortSignal) =>
  fetchAllPages<PaymentMethod>(`${base(o)}/payment-methods`, {}, signal);

export const savePaymentMethod = (
  o: string,
  body: Record<string, unknown>,
  id?: string,
) =>
  id
    ? api.patch<PaymentMethod>(`${base(o)}/payment-methods/${id}`, { body })
    : api.post<PaymentMethod>(`${base(o)}/payment-methods`, { body });

export const fetchExpenseCategories = (o: string, signal?: AbortSignal) =>
  fetchAllPages<ExpenseCategory>(`${base(o)}/expense-categories`, {}, signal);

export const saveExpenseCategory = (
  o: string,
  body: Record<string, unknown>,
  id?: string,
) =>
  id
    ? api.patch<ExpenseCategory>(`${base(o)}/expense-categories/${id}`, {
        body,
      })
    : api.post<ExpenseCategory>(`${base(o)}/expense-categories`, { body });

export const fetchMembers = (o: string, signal?: AbortSignal) =>
  fetchAllPages<Member>(`${base(o)}/members`, {}, signal);

export const fetchInvitations = (o: string, signal?: AbortSignal) =>
  fetchAllPages<Invitation>(`${base(o)}/invitations`, {}, signal);

export interface MembershipBody {
  role: Exclude<Role, 'OWNER'>;
  allBranches: boolean;
  branchIds: string[];
  permissions: string[];
}

export const inviteMember = (
  o: string,
  body: MembershipBody & { email: string },
) =>
  api.post<{ id: string; expiresAt: string }>(`${base(o)}/invitations`, {
    body,
  });

export const revokeInvitation = (o: string, id: string) =>
  api.post<{ revoked: boolean }>(`${base(o)}/invitations/${id}/revoke`, {
    body: {},
  });

export const updateMember = (
  o: string,
  id: string,
  body: MembershipBody & { revoked?: boolean },
) => api.patch<unknown>(`${base(o)}/members/${id}`, { body });
