'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import {
  VariantPicker,
  type PickedVariant,
} from '@/components/shared/variant-picker';
import { compareDecimal } from '@/lib/decimal';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { useWarehouses } from '@/lib/queries/reference';
import { money, reason, signedQuantity } from '@/lib/schemas/common';
import { adjustStock, inventoryPrefix } from '../api';

const schema = z.object({
  warehouseId: z.string().min(1, 'Elige un almacén'),
  delta: signedQuantity,
  unitCost: z.string(),
  reason,
});
type Values = z.input<typeof schema>;

export function AdjustDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const warehouses = useWarehouses(organizationId);
  const idem = useIdempotency();
  const [variant, setVariant] = useState<PickedVariant | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { warehouseId: '', delta: '', unitCost: '', reason: '' },
  });
  const errors = form.formState.errors;

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      if (!variant) throw new Error('Elige un artículo');
      // El costo solo aplica a entradas; una salida usa el promedio vigente.
      const body = {
        warehouseId: v.warehouseId,
        variantId: variant.id,
        delta: v.delta,
        reason: v.reason,
        ...(compareDecimal(v.delta, '0') > 0 && v.unitCost
          ? { unitCost: money.parse(v.unitCost) }
          : {}),
      };
      return adjustStock(organizationId, body, idem.keyFor(body));
    },
    invalidate: [
      inventoryPrefix(organizationId),
      ['organizations', organizationId, 'dashboard'],
    ],
    successMessage: 'Ajuste registrado',
    onSuccess: () => {
      idem.renew();
      form.reset();
      setVariant(null);
      onClose();
    },
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Ajuste de inventario"
      description="Usa números positivos para entradas y negativos para salidas. Requiere permiso de ajuste."
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Artículo</span>
        {variant ? (
          <p className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
            <span>
              {variant.label}{' '}
              <span className="text-muted-foreground">({variant.sku})</span>
            </span>
            <button
              type="button"
              className="text-primary underline"
              onClick={() => setVariant(null)}
            >
              Cambiar
            </button>
          </p>
        ) : (
          <VariantPicker onPick={setVariant} />
        )}
      </div>
      <FormField
        id="adj-warehouse"
        label="Almacén"
        error={errors.warehouseId?.message}
      >
        <Select id="adj-warehouse" {...form.register('warehouseId')}>
          <option value="">Selecciona…</option>
          {warehouses.data?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="adj-delta"
          label="Cantidad (+/−)"
          error={errors.delta?.message}
        >
          <Input
            id="adj-delta"
            inputMode="decimal"
            placeholder="-2 o 10"
            {...form.register('delta')}
          />
        </FormField>
        <FormField
          id="adj-cost"
          label="Costo unitario (solo entradas)"
          error={errors.unitCost?.message}
        >
          <Input
            id="adj-cost"
            inputMode="decimal"
            {...form.register('unitCost')}
          />
        </FormField>
      </div>
      <FormField id="adj-reason" label="Motivo" error={errors.reason?.message}>
        <Input id="adj-reason" {...form.register('reason')} />
      </FormField>
    </FormDialog>
  );
}
