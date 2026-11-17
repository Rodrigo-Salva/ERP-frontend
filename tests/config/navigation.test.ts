import { describe, expect, it } from 'vitest';
import { NAVIGATION, visibleNavigation } from '@/config/navigation';
import { ENABLED_MODULES } from '@/config/modules';

// Las reglas por rol se prueban sobre todos los módulos, sin depender de la fase activa.
const allowed = (role: Parameters<typeof visibleNavigation>[0]) =>
  NAVIGATION.filter((i) => i.roles.includes(role)).map((i) => i.key);
// Lo que realmente se ve: rol permitido y módulo activo.
const keys = (role: Parameters<typeof visibleNavigation>[0]) =>
  visibleNavigation(role).map((i) => i.key);

describe('navegación por rol', () => {
  it('el propietario y el administrador ven todos los módulos activos en la fase', () => {
    const active = NAVIGATION.map((i) => i.key).filter((key) =>
      (ENABLED_MODULES as readonly string[]).includes(key),
    );
    expect(keys('OWNER')).toEqual(active);
    expect(keys('ADMIN')).toEqual(active);
  });

  it('los módulos comentados en config/modules.ts no aparecen en el menú', () => {
    const hidden = NAVIGATION.map((i) => i.key).filter(
      (key) => !(ENABLED_MODULES as readonly string[]).includes(key),
    );
    for (const key of hidden) expect(keys('OWNER')).not.toContain(key);
  });

  it('el encargado gestiona catálogo, compras y gastos, pero no configura ni audita', () => {
    const manager = allowed('MANAGER');
    for (const key of ['pos', 'products', 'purchases', 'expenses', 'inventory'])
      expect(manager).toContain(key);
    for (const key of ['settings', 'audit']) expect(manager).not.toContain(key);
  });

  it('el cajero vende y cobra, sin compras, gastos ni configuración', () => {
    const cashier = allowed('CASHIER');
    for (const key of ['pos', 'sales', 'cash', 'customers'])
      expect(cashier).toContain(key);
    for (const key of ['purchases', 'expenses', 'settings', 'audit'])
      expect(cashier).not.toContain(key);
  });

  it('solo lectura consulta sin poder vender', () => {
    const viewer = allowed('VIEWER');
    expect(viewer).toEqual(
      expect.arrayContaining(['dashboard', 'products', 'inventory', 'reports']),
    );
    for (const key of ['pos', 'cash', 'purchases', 'settings'])
      expect(viewer).not.toContain(key);
  });

  it('las claves son únicas y todas las rutas son relativas', () => {
    expect(new Set(NAVIGATION.map((i) => i.key)).size).toBe(NAVIGATION.length);
    for (const item of NAVIGATION)
      expect(item.segment.startsWith('/')).toBe(false);
  });
});
