import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  /** Elementos recibidos en esta página. */
  count: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Si se conoce con certeza (listas ya cargadas); si no, se infiere de la página llena. */
  hasNext?: boolean;
}

/**
 * Siempre visible, también con una sola página (botones desactivados), para que se vea que
 * el listado está paginado. El backend no devuelve el total, así que "hay siguiente" se
 * infiere de que la página vino llena.
 */
export function Pagination({
  page,
  count,
  limit,
  onPageChange,
  hasNext = count >= limit,
}: PaginationProps) {
  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between pt-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden className="size-4" /> Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page}
        <span aria-hidden> · </span>
        {count} {count === 1 ? 'registro' : 'registros'}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente <ChevronRight aria-hidden className="size-4" />
      </Button>
    </nav>
  );
}
