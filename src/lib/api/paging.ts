import { api } from './client';
import type { Page } from './types';

const PAGE_SIZE = 100;
/** Tope de seguridad (5.000 filas) para que un listado enorme no encadene peticiones sin fin. */
const MAX_PAGES = 50;

/**
 * Lee TODAS las páginas de un listado y las junta. Se usa para selectores y catálogos de
 * referencia, donde cortar en 100 filas dejaría opciones inalcanzables. Las pantallas con
 * tablas paginan en cambio con <Pagination>.
 */
export async function fetchAllPages<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined | null> = {},
  signal?: AbortSignal,
): Promise<Page<T>> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await api.get<Page<T>>(path, {
      query: { ...query, page, limit: PAGE_SIZE },
      signal,
    });
    items.push(...batch.items);
    if (batch.items.length < PAGE_SIZE) break;
  }
  return { items, page: 1, limit: items.length };
}
