import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  formatDay,
  monthGrid,
  monthLabel,
  startOfMonth,
  todayIn,
} from '@/lib/dates';

describe('dates', () => {
  it('suma días y meses sin depender de la zona del equipo', () => {
    expect(addDays('2026-11-04', -4)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('da el primer día del mes y el formato visible', () => {
    expect(startOfMonth('2026-11-18')).toBe('2026-11-01');
    expect(formatDay('2026-11-04')).toBe('04/11/2026');
    expect(monthLabel('2026-11-04')).toBe('Noviembre de 2026');
  });

  it('arma 42 días empezando en lunes', () => {
    const grid = monthGrid('2026-11-04'); // 1/11/2026 es domingo
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-10-26'); // lunes anterior
    expect(grid).toContain('2026-11-30');
    expect(monthGrid('2026-06-10')[0]).toBe('2026-06-01'); // lunes 1/6/2026
  });

  it('calcula hoy en la zona indicada', () => {
    expect(todayIn('America/Lima')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
