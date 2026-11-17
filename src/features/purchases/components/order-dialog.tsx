'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { VariantPicker } from '@/components/shared/variant-picker';
import { fetchAllPages } from '@/lib/api/paging';
import type { Supplier } from '../types';
import { useWarehouses } from '@/lib/queries/reference';
import { money, optionalText, quantity } from '@/lib/schemas/common';
import { createOrder, purchasesPrefix, suppliersKey } from '../api';

const schema = z.object({
  supplierId: z.string().min(1, 'Elige un proveedor'),
  warehouseId: z.string().min(1, 'Elige el almacén de destino'),
  notes: optionalText(2000),
});
type Values = z.input<typeof schema>;

interface Line {
  variantId: string;
  label: string;
  quantity: string;
  unitCost: string;
}

export function OrderDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { organizationId, canSeeCosts } = useOrganization();
  const warehouses = useWarehouses(organizationId);
  const suppliers = useQuery({
    queryKey: suppliersKey(organizationId, { picker: true }),
    queryFn: ({ signal }) =>
      fetchAllPages<Supplier>(
        `/organizations/${organizationId}/suppliers`,
        {},
        signal,
      ),
    select: (page) => page.items,
    enabled: open,
  });
  const [lines, setLines] = useState<Line[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { supplierId: '', warehouseId: '', notes: '' },
  });
  const errors = form.formState.errors;
  const validLines =
    lines.length > 0 &&
    lines.every(
      (l) =>
        quantity.safeParse(l.quantity).success &&
        money.safeParse(l.unitCost).success,
    );

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      return createOrder(organizationId, {
        supplierId: v.supplierId,
        warehouseId: v.warehouseId,
        notes: v.notes,
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      });
    },
    invalidate: [purchasesPrefix(organizationId)],
    successMessage: 'Orden creada (borrador)',
    onSuccess: () => {
      form.reset();
      setLines([]);
      onClose();
    },
  });

  const patch = (variantId: string, changes: Partial<Line>) =>
    setLines(
      lines.map((l) => (l.variantId === variantId ? { ...l, ...changes } : l)),
    );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nueva orden de compra"
      description="Se crea en borrador. Envíala al proveedor y registra la recepción cuando llegue la mercadería."
      pending={mutation.isPending}
      onSubmit={form.handleSubmit(
        (values) => validLines && mutation.mutate(values),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="po-supplier"
          label="Proveedor"
          error={errors.supplierId?.message}
        >
          <Select id="po-supplier" {...form.register('supplierId')}>
            <option value="">Selecciona…</option>
            {suppliers.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="po-warehouse"
          label="Almacén de destino"
          error={errors.warehouseId?.message}
        >
          <Select id="po-warehouse" {...form.register('warehouseId')}>
            <option value="">Selecciona…</option>
            {warehouses.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Artículos</span>
        <VariantPicker
          onPick={(v) =>
            setLines((current) =>
              current.some((l) => l.variantId === v.id)
                ? current
                : [
                    ...current,
                    {
                      variantId: v.id,
                      label: v.label,
                      quantity: '1',
                      unitCost: canSeeCosts ? (v.cost ?? '') : '',
                    },
                  ],
            )
          }
        />
        {lines.map((line) => (
          <div
            key={line.variantId}
            className="grid items-center gap-2 sm:grid-cols-[1fr_6rem_7rem_2rem]"
          >
            <span className="text-sm">{line.label}</span>
            <Input
              aria-label={`Cantidad de ${line.label}`}
              inputMode="decimal"
              value={line.quantity}
              aria-invalid={!quantity.safeParse(line.quantity).success}
              onChange={(e) =>
                patch(line.variantId, { quantity: e.target.value })
              }
              className="text-right"
            />
            <Input
              aria-label={`Costo unitario de ${line.label}`}
              inputMode="decimal"
              placeholder="Costo"
              value={line.unitCost}
              aria-invalid={!money.safeParse(line.unitCost).success}
              onChange={(e) =>
                patch(line.variantId, { unitCost: e.target.value })
              }
              className="text-right"
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Quitar ${line.label}`}
              onClick={() =>
                setLines(lines.filter((l) => l.variantId !== line.variantId))
              }
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </div>
        ))}
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega al menos un artículo.
          </p>
        ) : null}
      </div>

      <FormField
        id="po-notes"
        label="Notas (opcional)"
        error={errors.notes?.message}
      >
        <Input id="po-notes" {...form.register('notes')} />
      </FormField>
    </FormDialog>
  );
}
