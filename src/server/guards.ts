import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { MembershipSummary, Role } from '@/lib/api/types';
import { isModuleEnabled, type ModuleKey } from '@/config/modules';
import { getProfile } from './profile';

/**
 * Exige que el usuario tenga uno de los `roles` en la organización. Es una comprobación
 * de interfaz (evita mostrar pantallas que no le corresponden); el backend vuelve a
 * autorizar cada llamada. Sin permiso se responde 404 para no revelar la pantalla.
 */
export async function requireRole(
  organizationId: string,
  roles?: readonly Role[],
  module?: ModuleKey,
): Promise<MembershipSummary> {
  // Módulo todavía no entregado en esta fase: la ruta no existe para nadie.
  if (module && !isModuleEnabled(module)) notFound();
  const profile = await getProfile();
  if (!profile) redirect('/login');
  const membership = profile.memberships.find(
    (m) => m.organizationId === organizationId,
  );
  if (!membership || (roles && !roles.includes(membership.role))) notFound();
  return membership;
}

export const MANAGEMENT: readonly Role[] = ['OWNER', 'ADMIN', 'MANAGER'];
export const SELLING: readonly Role[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'CASHIER',
];
export const ADMINS: readonly Role[] = ['OWNER', 'ADMIN'];
