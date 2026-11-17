'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { QueryState } from '@/components/ui/data/query-state';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { percentage, requiredText } from '@/lib/schemas/common';
import {
  fetchSettings,
  settingsKey,
  settingsPrefix,
  updateSettings,
} from '../api';
import type { OrganizationSettings } from '../types';

const schema = z.object({
  name: requiredText('el nombre'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Código de 3 letras (p. ej. PEN)'),
  locale: requiredText('el idioma/región (p. ej. es-PE)', 35),
  timeZone: requiredText('la zona horaria (p. ej. America/Lima)', 80),
  moneyPrecision: z.string().regex(/^[0-4]$/, 'Entre 0 y 4'),
  taxRate: percentage,
  taxIncluded: z.boolean(),
  discountLimit: percentage,
  allowNegativeStock: z.boolean(),
  receiptPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9_-]{0,11}$/,
      'Hasta 12 caracteres: letras, números, guion',
    ),
});
type Values = z.input<typeof schema>;

export function OrganizationForm() {
  const { organizationId } = useOrganization();
  const query = useQuery({
    queryKey: settingsKey(organizationId, 'organization'),
    queryFn: ({ signal }) => fetchSettings(organizationId, signal),
  });
  return (
    <QueryState query={query}>
      {(settings) => <Form key={settings.id} initial={settings} />}
    </QueryState>
  );
}

function Form({ initial }: { initial: OrganizationSettings }) {
  const { organizationId } = useOrganization();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial.name,
      currency: initial.currency,
      locale: initial.locale,
      timeZone: initial.timeZone,
      moneyPrecision: String(initial.moneyPrecision),
      taxRate: String(Number(initial.taxRate)),
      taxIncluded: initial.taxIncluded,
      discountLimit: String(Number(initial.discountLimit)),
      allowNegativeStock: initial.allowNegativeStock,
      receiptPrefix: initial.receiptPrefix,
    },
  });
  const errors = form.formState.errors;

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      return updateSettings(organizationId, {
        ...v,
        moneyPrecision: Number(v.moneyPrecision),
      });
    },
    invalidate: [settingsPrefix(organizationId)],
    successMessage: 'Configuración guardada',
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4"
    >
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Datos de la tienda</h2>
        <FormField id="o-name" label="Nombre" error={errors.name?.message}>
          <Input id="o-name" {...form.register('name')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            id="o-currency"
            label="Moneda"
            error={errors.currency?.message}
          >
            <Input
              id="o-currency"
              className="uppercase"
              {...form.register('currency')}
            />
          </FormField>
          <FormField
            id="o-locale"
            label="Idioma / región"
            error={errors.locale?.message}
          >
            <Input id="o-locale" {...form.register('locale')} />
          </FormField>
          <FormField
            id="o-tz"
            label="Zona horaria"
            error={errors.timeZone?.message}
          >
            <Input id="o-tz" {...form.register('timeZone')} />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Ventas e impuestos</h2>
        <p className="text-sm text-muted-foreground">
          El recibo es interno y no es un comprobante fiscal. Valida las tasas
          con tu asesor local.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            id="o-precision"
            label="Decimales de la moneda"
            error={errors.moneyPrecision?.message}
          >
            <Input
              id="o-precision"
              inputMode="numeric"
              {...form.register('moneyPrecision')}
            />
          </FormField>
          <FormField
            id="o-tax"
            label="Impuesto (%)"
            error={errors.taxRate?.message}
          >
            <Input
              id="o-tax"
              inputMode="decimal"
              {...form.register('taxRate')}
            />
          </FormField>
          <FormField
            id="o-discount"
            label="Descuento libre hasta (%)"
            error={errors.discountLimit?.message}
          >
            <Input
              id="o-discount"
              inputMode="decimal"
              {...form.register('discountLimit')}
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('taxIncluded')} />
          Los precios ya incluyen el impuesto
        </label>
        <FormField
          id="o-prefix"
          label="Prefijo de folios"
          error={errors.receiptPrefix?.message}
        >
          <Input
            id="o-prefix"
            className="max-w-40 uppercase"
            {...form.register('receiptPrefix')}
          />
        </FormField>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-base font-semibold">Inventario</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('allowNegativeStock')} />
          Permitir stock negativo (además exige el permiso individual del
          usuario)
        </label>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
