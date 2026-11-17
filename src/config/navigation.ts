import type { Role } from '@/lib/api/types';
import { isModuleEnabled, type ModuleKey } from './modules';

export interface NavItem {
  key: string;
  label: string;
  /** Ruta bajo /<organizationId>/. */
  segment: string;
  /** false mientras la pantalla no exista: se muestra deshabilitada. */
  available: boolean;
  /** Roles que ven el módulo (el servidor autoriza igualmente cada llamada). */
  roles: readonly Role[];
  /** El enlace solo está activo en esta ruta exacta, no en sus subrutas. */
  exact?: boolean;
}

const ALL: readonly Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'VIEWER'];
const MANAGEMENT: readonly Role[] = ['OWNER', 'ADMIN', 'MANAGER'];
const SELLING: readonly Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'];
const ADMINS: readonly Role[] = ['OWNER', 'ADMIN'];

const item = (
  key: string,
  label: string,
  segment: string,
  roles: readonly Role[],
  extra: Partial<NavItem> = {},
): NavItem => ({ key, label, segment, roles, available: true, ...extra });

/**
 * Mapa de módulos del ERP. Añadir una pantalla = crear su feature y página, y declararla
 * aquí; el armazón no cambia. `available: false` la muestra deshabilitada.
 */
export const NAVIGATION: readonly NavItem[] = [
  item('dashboard', 'Panel', 'dashboard', ALL),
  item('pos', 'Punto de venta', 'sales', SELLING, { exact: true }),
  item('sales', 'Ventas', 'sales/history', SELLING),
  item('cash', 'Caja', 'cash', SELLING),
  item('expenses', 'Gastos', 'expenses', MANAGEMENT),
  item('products', 'Productos', 'products', ALL, { exact: true }),
  item('categories', 'Categorías y unidades', 'products/categories', ALL),
  item('inventory', 'Inventario', 'inventory', ALL),
  item('purchases', 'Compras', 'purchases', MANAGEMENT),
  item('customers', 'Clientes', 'customers', SELLING),
  item('reports', 'Reportes', 'reports', ALL),
  item('audit', 'Auditoría', 'audit', ADMINS),
  item('settings', 'Configuración', 'settings', ADMINS),
];

/** Lo que se ve en el menú: el rol lo permite Y el módulo está activo en la fase actual. */
export const visibleNavigation = (role: Role): NavItem[] =>
  NAVIGATION.filter(
    (entry) =>
      entry.roles.includes(role) && isModuleEnabled(entry.key as ModuleKey),
  );
