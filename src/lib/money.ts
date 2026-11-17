import type { Decimal } from './api/types';

/**
 * Formatea un importe decimal del backend para mostrarlo. Intl.NumberFormat acepta
 * cadenas decimales y las formatea sin pasar por `number`, así que no hay errores de
 * coma flotante. Solo para presentación: los cálculos de negocio los hace el servidor.
 */
export function formatMoney(
  value: Decimal,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    value as `${number}`,
  );
}

/** Cantidad con los decimales que traiga el backend (hasta 3), sin ceros sobrantes. */
export function formatQuantity(value: Decimal, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
    value as `${number}`,
  );
}
