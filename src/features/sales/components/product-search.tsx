'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ScanBarcode, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Input } from '@/components/ui/forms/input';
import { useToast } from '@/components/ui/overlays/toast';
import { searchVariants } from '../api';
import { useVariantSearch } from '../hooks';
import { variantLabel, type VariantHit } from '../types';

interface ProductSearchProps {
  onPick: (variant: VariantHit) => void;
}

/**
 * Búsqueda por nombre, SKU o código de barras. Los lectores de código se comportan como
 * teclado y terminan con Enter: si el texto coincide exactamente con un código o SKU, el
 * artículo se agrega al instante.
 */
export function ProductSearch({ onPick }: ProductSearchProps) {
  const { organizationId, money } = useOrganization();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = useVariantSearch(organizationId, text);

  function pick(variant: VariantHit) {
    onPick(variant);
    setText('');
    input.current?.focus();
  }

  async function onEnter() {
    const q = text.trim();
    if (!q) return;
    const page = await queryClient.fetchQuery({
      queryKey: ['organizations', organizationId, 'variant-search', q],
      queryFn: ({ signal }) => searchVariants(organizationId, q, signal),
      staleTime: 15_000,
    });
    const exact = page.items.filter(
      (v) => v.barcode === q || v.sku.toLowerCase() === q.toLowerCase(),
    );
    const only =
      exact.length === 1
        ? exact[0]
        : page.items.length === 1
          ? page.items[0]
          : undefined;
    if (only) pick(only);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute top-3 left-3 size-4 text-muted-foreground"
        />
        <Input
          ref={input}
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void onEnter().catch((error: unknown) =>
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'No se pudo buscar el artículo. Intenta nuevamente.',
                ),
              );
            }
          }}
          placeholder="Buscar o escanear código de barras"
          aria-label="Buscar artículo"
          className="h-12 pl-10"
        />
      </div>
      {text.trim() ? (
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
          {results.error ? (
            <li role="alert" className="p-4 text-sm text-danger">
              {results.error.message}
            </li>
          ) : results.isFetching && !results.data ? (
            <li className="p-3 text-sm text-muted-foreground">Buscando…</li>
          ) : results.data && results.data.length > 0 ? (
            results.data.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  onClick={() => pick(variant)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted"
                >
                  <span>
                    <span className="block font-medium">
                      {variantLabel(variant)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {variant.sku}
                      {variant.barcode ? ` · ${variant.barcode}` : ''}
                    </span>
                  </span>
                  <span className="tabular-nums">{money(variant.price)}</span>
                </button>
              </li>
            ))
          ) : results.data ? (
            <li className="p-3 text-sm text-muted-foreground">
              Sin resultados
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <div>
            <ScanBarcode
              aria-hidden
              className="mx-auto mb-4 size-9 text-muted-foreground"
            />
            <p className="text-sm font-medium">Encuentra el próximo artículo</p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Busca por nombre o SKU, o escanea el código de barras para
              añadirlo a la venta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
