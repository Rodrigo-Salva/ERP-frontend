import type { Decimal, Role } from '@/lib/api/types';

export interface OrganizationSettings {
  id: string;
  name: string;
  currency: string;
  locale: string;
  timeZone: string;
  moneyPrecision: number;
  taxRate: Decimal;
  taxIncluded: boolean;
  discountLimit: Decimal;
  allowNegativeStock: boolean;
  receiptPrefix: string;
}

export interface Member {
  id: string;
  role: Role;
  allBranches: boolean;
  permissions: string[];
  branches: Array<{ branchId: string }>;
  user: { id: string; name: string; email: string };
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

export const PERMISSION_LABELS: Record<string, string> = {
  'inventory.adjust': 'Ajustar inventario',
  'inventory.negative': 'Permitir vender con stock negativo',
  'sales.discount': 'Aplicar descuentos sobre el límite',
  'sales.return': 'Registrar devoluciones',
  'sales.cancel': 'Anular ventas',
  'cash.adjust': 'Movimientos manuales de caja y gastos desde caja',
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MANAGER: 'Encargado',
  CASHIER: 'Cajero',
  VIEWER: 'Solo lectura',
};

export const ASSIGNABLE_ROLES = [
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'VIEWER',
] as const;
