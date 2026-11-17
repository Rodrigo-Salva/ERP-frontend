/**
 * Utilidades de días calendario como texto AAAA-MM-DD. Se calcula siempre en UTC para que
 * el resultado no dependa de la zona del navegador ni de cambios de horario.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return { y, m, d };
}

export function toDay(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const fromDay = (day: string) => {
  const { y, m, d } = parseDay(day);
  return new Date(Date.UTC(y, m - 1, d));
};

export function addDays(day: string, amount: number): string {
  const date = fromDay(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDay(date);
}

/** Suma meses conservando el día cuando existe (31 de enero + 1 mes = 28/29 de febrero). */
export function addMonths(day: string, amount: number): string {
  const { y, m, d } = parseDay(day);
  const first = new Date(Date.UTC(y, m - 1 + amount, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return toDay(first);
}

export const startOfMonth = (day: string) => `${day.slice(0, 7)}-01`;

/** Día de hoy en la zona indicada (la de la tienda), no en la del navegador. */
export function todayIn(timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

/** 42 días (6 semanas, lunes a domingo) que cubren el mes de `day`. */
export function monthGrid(day: string): string[] {
  const first = fromDay(startOfMonth(day));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = addDays(toDay(first), -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** «04/11/2026» para mostrar en pantalla. */
export function formatDay(day: string): string {
  const { y, m, d } = parseDay(day);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** «Noviembre de 2026». */
export function monthLabel(day: string): string {
  const text = new Intl.DateTimeFormat('es', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fromDay(day));
  return text.charAt(0).toUpperCase() + text.slice(1).replace(' de ', ' de ');
}

/** «miércoles, 4 de noviembre de 2026», para lectores de pantalla. */
export function longDay(day: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(fromDay(day));
}
