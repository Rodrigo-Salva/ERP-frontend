'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { Decimal, Page } from '@/lib/api/types';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { Input } from '@/components/ui/forms/input';
import { useOrganization } from '@/components/providers/organization-context';

interface VariantRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  isDefault: boolean;
  price: Decimal;
  cost?: Decimal;
  product: { name: string };
}

export interface PickedVariant {
  id: string;
  sku: string;
  label: string;
  price: Decimal;
  cost?: Decimal;
}

const labelOf = (v: VariantRow) =>
  v.isDefault ? v.product.name : `${v.product.name} - ${v.name}`;

/** Buscador de artículos por nombre, SKU o código de barras para formularios. */
export function VariantPicker({
  onPick,
  placeholder = 'Buscar artículo por nombre, SKU o código',
  id,
}: {
  onPick: (variant: PickedVariant) => void;
  placeholder?: string;
  id?: string;
}) {
  const { organizationId } = useOrganization();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 250);
  const results = useQuery({
    queryKey: ['organizations', organizationId, 'variant-search', q],
    queryFn: ({ signal }) =>
      api.get<Page<VariantRow>>(`/organizations/${organizationId}/variants`, {
        query: { q, limit: 10 },
        signal,
      }),
    enabled: q.length > 0,
    select: (page) => page.items,
    staleTime: 15_000,
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute top-3 left-3 size-4 text-muted-foreground"
        />
        <Input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar artículo"
          className="pl-9"
        />
      </div>
      {q ? (
        <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {results.data?.length ? (
            results.data.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  className="w-full p-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onPick({
                      id: variant.id,
                      sku: variant.sku,
                      label: labelOf(variant),
                      price: variant.price,
                      cost: variant.cost,
                    });
                    setText('');
                  }}
                >
                  <span className="font-medium">{labelOf(variant)}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    {variant.sku}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="p-2 text-sm text-muted-foreground">
              {results.isFetching ? 'Buscando…' : 'Sin resultados'}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
