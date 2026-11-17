'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Role } from '@/lib/api/types';
import { formatMoney } from '@/lib/money';

export interface OrganizationInfo {
  organizationId: string;
  name: string;
  currency: string;
  locale: string;
  timeZone: string;
  role: Role;
  allBranches: boolean;
  permissions: string[];
}

const OrganizationContext = createContext<OrganizationInfo | null>(null);

/** Datos de la organización activa; los entrega el layout tras validar la membresía. */
export function OrganizationProvider({
  value,
  children,
}: {
  value: OrganizationInfo;
  children: ReactNode;
}) {
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const info = useContext(OrganizationContext);
  if (!info)
    throw new Error(
      'useOrganization debe usarse dentro de OrganizationProvider',
    );
  const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(info.role);
  return {
    ...info,
    isAdmin: info.role === 'OWNER' || info.role === 'ADMIN',
    isManager,
    /** Propietario y administrador lo tienen todo; el resto, solo sus permisos explícitos. */
    can: (permission: string) =>
      info.role === 'OWNER' ||
      info.role === 'ADMIN' ||
      info.permissions.includes(permission),
    /** Los costos solo los ven roles de gestión (el servidor los omite para el resto). */
    canSeeCosts: isManager,
    canSell: isManager || info.role === 'CASHIER',
    money: (value: string) => formatMoney(value, info.currency, info.locale),
    dateTime: (iso: string) =>
      new Intl.DateTimeFormat(info.locale, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: info.timeZone,
      }).format(new Date(iso)),
  };
}
