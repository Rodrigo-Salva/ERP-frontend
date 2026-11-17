/**
 * Tipos de la API del backend. Los importes y cantidades son SIEMPRE cadenas decimales
 * (el backend no usa números JSON para dinero); nunca se operan con `number`.
 */
export type Decimal = string;

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER';

export interface MembershipSummary {
  id: string;
  role: Role;
  organizationId: string;
  allBranches: boolean;
  /** Permisos explícitos adicionales al rol. */
  permissions: string[];
  organization: {
    name: string;
    currency: string;
    locale: string;
    timeZone: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  memberships: MembershipSummary[];
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
}

/** Filtros de listado comunes a casi todos los recursos. */
export interface ListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  branchId?: string;
  from?: string;
  to?: string;
  /** Días completos (AAAA-MM-DD) en la zona horaria de la tienda o sucursal. */
  fromDay?: string;
  toDay?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  timeZone: string;
  archivedAt: string | null;
}

export interface Warehouse {
  id: string;
  branchId: string;
  name: string;
  code: string;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  isCash: boolean;
  archivedAt: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  archivedAt: string | null;
}

export interface CashRegister {
  id: string;
  branchId: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  archivedAt: string | null;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  precision: number;
  archivedAt: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  consentAt: string;
  archivedAt: string | null;
}
