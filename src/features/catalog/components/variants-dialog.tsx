'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { ClientPaged } from '@/components/ui/data/client-paged';
import { QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { money, optionalText, requiredText } from '@/lib/schemas/common';
import {
  createVariant,
  fetchVariants,
  productsPrefix,
  updateVariant,
  variantsKey,
} from '../api';
import type { Product, Variant } from '../types';

const schema = z.object({
  name: requiredText('el nombre de la variante', 120),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9._-]{0,63}$/, 'SKU inválido'),
  barcode: optionalText(64),
  price: money,
  cost: money,
});
type Values = z.input<typeof schema>;

export function VariantsDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={product !== null}
      onClose={onClose}
      title={product ? `Variantes de ${product.name}` : 'Variantes'}
      description="Cada variante (talla, color…) tiene su propio SKU, código y precio."
      className="w-[min(94vw,52rem)]"
      confirmOnClose
    >
      {product ? <Body key={product.id} product={product} /> : null}
    </Dialog>
  );
}

function Body({ product }: { product: Product }) {
  const { organizationId, money: format, canSeeCosts } = useOrganization();
  const [editing, setEditing] = useState<Variant | 'new' | null>(null);
  const query = useQuery({
    queryKey: variantsKey(organizationId, product.id),
    queryFn: ({ signal }) => fetchVariants(organizationId, product.id, signal),
  });

  const archive = useApiMutation({
    mutationFn: (variant: Variant) =>
      updateVariant(organizationId, product.id, variant.id, {
        archived: !variant.archivedAt,
      }),
    invalidate: [
      variantsKey(organizationId, product.id),
      productsPrefix(organizationId),
    ],
    successMessage: 'Variante actualizada',
  });

  return (
    <div className="space-y-4">
      <QueryState query={query}>
        {(data) => (
          <ClientPaged items={data.items} size={8}>
            {(rows) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Variante</TH>
                    <TH>SKU</TH>
                    <TH>Código</TH>
                    <TH numeric>Precio</TH>
                    {canSeeCosts ? <TH numeric>Costo</TH> : null}
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <tbody>
                  {rows.map((variant) => (
                    <TR key={variant.id}>
                      <TD>
                        {variant.name}{' '}
                        {variant.isDefault ? (
                          <Badge tone="info">Principal</Badge>
                        ) : null}
                        {variant.archivedAt ? <Badge>Archivada</Badge> : null}
                      </TD>
                      <TD>{variant.sku}</TD>
                      <TD>{variant.barcode ?? '—'}</TD>
                      <TD numeric>{format(variant.price)}</TD>
                      {canSeeCosts ? (
                        <TD numeric>
                          {variant.cost ? format(variant.cost) : '—'}
                        </TD>
                      ) : null}
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(variant)}
                          >
                            Editar
                          </Button>
                          {!variant.isDefault ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={archive.isPending}
                              onClick={() => archive.mutate(variant)}
                            >
                              {variant.archivedAt ? 'Restaurar' : 'Archivar'}
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </ClientPaged>
        )}
      </QueryState>

      {editing ? (
        <VariantForm
          key={editing === 'new' ? 'new' : editing.id}
          productId={product.id}
          variant={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button variant="outline" onClick={() => setEditing('new')}>
          Agregar variante
        </Button>
      )}
    </div>
  );
}

function VariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: Variant | null;
  onDone: () => void;
}) {
  const { organizationId } = useOrganization();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: variant?.name ?? '',
      sku: variant?.sku ?? '',
      barcode: variant?.barcode ?? '',
      price: variant?.price ?? '',
      cost: variant?.cost ?? '',
    },
  });
  const errors = form.formState.errors;

  function requestDone() {
    if (form.formState.isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onDone();
  }

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      const body = {
        name: v.name,
        sku: v.sku,
        barcode: v.barcode ?? null,
        price: v.price,
        cost: v.cost,
      };
      return variant
        ? updateVariant(organizationId, productId, variant.id, body)
        : createVariant(organizationId, productId, body);
    },
    invalidate: [
      variantsKey(organizationId, productId),
      productsPrefix(organizationId),
    ],
    successMessage: variant ? 'Variante actualizada' : 'Variante creada',
    onSuccess: onDone,
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="space-y-3 rounded-md border border-border p-4"
    >
      <h3 className="text-sm font-semibold">
        {variant ? 'Editar variante' : 'Nueva variante'}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          id="v-name"
          label="Nombre (p. ej. Talla M)"
          error={errors.name?.message}
        >
          <Input id="v-name" {...form.register('name')} />
        </FormField>
        <FormField id="v-sku" label="SKU" error={errors.sku?.message}>
          <Input id="v-sku" className="uppercase" {...form.register('sku')} />
        </FormField>
        <FormField
          id="v-barcode"
          label="Código de barras"
          error={errors.barcode?.message}
        >
          <Input id="v-barcode" {...form.register('barcode')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="v-price" label="Precio" error={errors.price?.message}>
            <Input
              id="v-price"
              inputMode="decimal"
              {...form.register('price')}
            />
          </FormField>
          <FormField id="v-cost" label="Costo" error={errors.cost?.message}>
            <Input id="v-cost" inputMode="decimal" {...form.register('cost')} />
          </FormField>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={requestDone}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar variante'}
        </Button>
      </div>
      <Dialog
        open={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        title="¿Descartar los cambios?"
        description="Lo que escribiste en esta variante no se guardará."
        className="w-[min(92vw,26rem)]"
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmingDiscard(false)}>
            Seguir editando
          </Button>
          <Button
            onClick={() => {
              setConfirmingDiscard(false);
              onDone();
            }}
          >
            Descartar cambios
          </Button>
        </div>
      </Dialog>
    </form>
  );
}
