import { api } from '@/lib/api/client';
import type { Customer, ListParams, Page } from '@/lib/api/types';

const base = (o: string) => `/organizations/${o}/customers`;

export const customersPrefix = (o: string) =>
  ['organizations', o, 'customers'] as const;
export const customersKey = (o: string, params?: unknown) =>
  [...customersPrefix(o), params ?? {}] as const;

export const fetchCustomers = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) => api.get<Page<Customer>>(base(o), { query: { ...params }, signal });

export interface CustomerBody {
  name?: string;
  email?: string | null;
  phone?: string | null;
  consent?: true;
  archived?: boolean;
}

export const saveCustomer = (o: string, body: CustomerBody, id?: string) =>
  id
    ? api.patch<Customer>(`${base(o)}/${id}`, { body })
    : api.post<Customer>(base(o), { body });
