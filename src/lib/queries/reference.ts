import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/lib/api/paging';
import type {
  Branch,
  CashRegister,
  Category,
  Customer,
  ExpenseCategory,
  PaymentMethod,
  Unit,
  Warehouse,
} from '@/lib/api/types';

/**
 * Datos de referencia que casi todas las pantallas necesitan (listas para selectores).
 * Cambian poco, así que se mantienen frescos varios minutos.
 */
const STALE = 5 * 60_000;
const key = (organizationId: string, resource: string) =>
  ['organizations', organizationId, 'ref', resource] as const;

export const referenceKeys = {
  branches: (o: string) => key(o, 'branches'),
  warehouses: (o: string) => key(o, 'warehouses'),
  paymentMethods: (o: string) => key(o, 'payment-methods'),
  expenseCategories: (o: string) => key(o, 'expense-categories'),
  cashRegisters: (o: string) => key(o, 'cash-registers'),
  categories: (o: string) => key(o, 'categories'),
  units: (o: string) => key(o, 'units'),
  customers: (o: string) => key(o, 'customers'),
};

const base = (o: string) => `/organizations/${o}`;

export const useBranches = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.branches(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<Branch>(`${base(organizationId)}/branches`, {}, signal),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const useWarehouses = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.warehouses(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<Warehouse>(
        `${base(organizationId)}/warehouses`,
        {},
        signal,
      ),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const usePaymentMethods = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.paymentMethods(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<PaymentMethod>(
        `${base(organizationId)}/payment-methods`,
        {},
        signal,
      ),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const useExpenseCategories = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.expenseCategories(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<ExpenseCategory>(
        `${base(organizationId)}/expense-categories`,
        {},
        signal,
      ),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const useCashRegisters = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.cashRegisters(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<CashRegister>(
        `${base(organizationId)}/cash-registers`,
        {},
        signal,
      ),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const useCategories = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.categories(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<Category>(`${base(organizationId)}/categories`, {}, signal),
    select: (page) => page.items,
    staleTime: STALE,
  });

export const useUnits = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.units(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<Unit>(`${base(organizationId)}/units`, {}, signal),
    select: (page) => page.items,
    staleTime: STALE,
  });

/** Clientes activos para selectores (la gestión completa vive en la feature de clientes). */
export const useCustomers = (organizationId: string) =>
  useQuery({
    queryKey: referenceKeys.customers(organizationId),
    queryFn: ({ signal }) =>
      fetchAllPages<Customer>(`${base(organizationId)}/customers`, {}, signal),
    select: (page) => page.items,
    staleTime: 60_000,
  });
