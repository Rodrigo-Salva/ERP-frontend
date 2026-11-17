import type { ColumnPoint } from './column-chart';

export interface SeriesPoint {
  /** AAAA-MM-DD, o AAAA-MM en series mensuales. */
  key: string;
  total: number;
  count: number;
}

export interface Series {
  granularity: 'day' | 'month';
  points: SeriesPoint[];
}

const SHORT_DAY = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const SHORT_MONTH = new Intl.DateTimeFormat('es', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const LONG_DAY = new Intl.DateTimeFormat('es', {
  dateStyle: 'full',
  timeZone: 'UTC',
});
const LONG_MONTH = new Intl.DateTimeFormat('es', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Convierte la serie del backend en columnas con etiquetas en español. */
export function seriesToColumns(series: Series): ColumnPoint[] {
  const monthly = series.granularity === 'month';
  return series.points.map((point) => {
    const date = new Date(
      `${monthly ? `${point.key}-01` : point.key}T00:00:00Z`,
    );
    return {
      key: point.key,
      label: (monthly ? SHORT_MONTH : SHORT_DAY).format(date).replace('.', ''),
      title: (monthly ? LONG_MONTH : LONG_DAY).format(date),
      value: point.total,
    };
  });
}

export const sumSeries = (series: Series) =>
  series.points.reduce((sum, point) => sum + point.total, 0);

/** Etiqueta corta para el pie de una columna (el nombre completo va en el tooltip). */
export const shortLabel = (text: string, max = 11) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
