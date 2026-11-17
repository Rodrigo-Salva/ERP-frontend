export const ENABLED_MODULES = [
  // ── Fase 1 · Vender y tener el catálogo al día ────────────────────────────
  'dashboard', // Panel
  'products', // Productos
  'categories', // Categorías y unidades de medida
  'inventory', // Inventario (existencias, ajustes, movimientos)
  'pos', // Punto de venta
  'sales', // Historial de ventas y devoluciones

  // ── Fase 2 · Control del efectivo ─────────────────────────────────────────
  'cash', // Caja (aperturas, movimientos y cierres)
  'expenses', // Gastos

  // ── Fase 3 · Abastecimiento y clientes ────────────────────────────────────
  'purchases', // Compras y proveedores
  'customers', // Clientes

  // ── Fase 4 · Análisis y administración ────────────────────────────────────
  'reports', // Reportes y exportaciones
  'audit', // Auditoría
  'settings', // Configuración, equipo y apariencia
] as const;

export type ModuleKey =
  | (typeof ENABLED_MODULES)[number]
  | 'cash'
  | 'expenses'
  | 'purchases'
  | 'customers'
  | 'reports'
  | 'audit'
  | 'settings';

const enabled: ReadonlySet<string> = new Set(ENABLED_MODULES);

const everything = process.env.NEXT_PUBLIC_ALL_MODULES === 'true';

export const isModuleEnabled = (key: ModuleKey): boolean =>
  everything || enabled.has(key);
