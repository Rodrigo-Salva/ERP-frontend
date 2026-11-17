'use client';

import { useState, type ReactNode } from 'react';
import { Pagination } from './pagination';

/**
 * Pagina en el cliente una lista que ya llegó completa (catálogos de configuración que el
 * backend acota). Si la lista cambia y la página actual deja de existir, vuelve a la última.
 */
export function ClientPaged<T>({
  items,
  size = 20,
  children,
}: {
  items: T[];
  size?: number;
  children: (rows: T[]) => ReactNode;
}) {
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(requested, pages);
  const rows = items.slice((page - 1) * size, page * size);
  return (
    <>
      {children(rows)}
      <Pagination
        page={page}
        count={rows.length}
        limit={size}
        hasNext={page < pages}
        onPageChange={setPage}
      />
    </>
  );
}
