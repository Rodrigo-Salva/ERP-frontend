'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { Textarea } from '@/components/ui/forms/textarea';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useCategories, useUnits } from '@/lib/queries/reference';
import { money, optionalText, requiredText } from '@/lib/schemas/common';
import {
  createProduct,
  productsPrefix,
  updateProduct,
  type ProductBody,
} from '../api';
import type { Product } from '../types';

const schema = z.object({
  name: requiredText('el nombre'),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9._-]{0,63}$/,
      'Solo letras, números, punto, guion y guion bajo (máx. 64)',
    ),
  barcode: optionalText(64),
  unitId: z.string().min(1, 'Elige una unidad'),
  categoryId: z.string(),
  description: optionalText(2000),
  cost: z.string(),
  price: money,
  lowStockThreshold: z
    .string()
    .trim()
    .regex(/^(0|[1-9]\d{0,11})(\.\d{1,3})?$/, 'Cantidad inválida'),
});
type Values = z.input<typeof schema>;

const empty: Values = {
  name: '',
  sku: '',
  barcode: '',
  unitId: '',
  categoryId: '',
  description: '',
  cost: '',
  price: '',
  lowStockThreshold: '0',
};

export function ProductFormDialog({
  open,
  product,
  onClose,
}: {
  open: boolean;
  /** null = crear; un producto = editar. */
  product: Product | null;
  onClose: () => void;
}) {
  const { organizationId, canSeeCosts } = useOrganization();
  const categories = useCategories(organizationId);
  const units = useUnits(organizationId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  const errors = form.formState.errors;
  const editing = product !== null;

  useEffect(() => {
    if (!open) return;
    form.reset(
      product
        ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode ?? '',
            unitId: product.unitId,
            categoryId: product.categoryId ?? '',
            description: product.description ?? '',
            cost: product.cost ?? '',
            price: product.price,
            lowStockThreshold: product.lowStockThreshold,
          }
        : empty,
    );
  }, [open, product, form]);

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      if (!canSeeCosts && !editing)
        throw new Error('Solo la gestión puede crear productos');
      const body: ProductBody = {
        name: v.name,
        sku: v.sku,
        barcode: v.barcode ?? null,
        categoryId: v.categoryId || null,
        description: v.description ?? null,
        price: v.price,
        lowStockThreshold: v.lowStockThreshold,
        ...(v.cost ? { cost: money.parse(v.cost) } : {}),
      };
      return editing
        ? updateProduct(organizationId, product.id, body)
        : createProduct(organizationId, {
            ...body,
            unitId: v.unitId,
            cost: money.parse(v.cost),
          });
    },
    invalidate: [
      productsPrefix(organizationId),
      ['organizations', organizationId, 'variant-search'],
    ],
    successMessage: editing ? 'Producto actualizado' : 'Producto creado',
    onSuccess: onClose,
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      description="El precio y el costo se guardan con hasta 4 decimales."
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id="name" label="Nombre" error={errors.name?.message}>
        <Input id="name" {...form.register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="sku" label="SKU" error={errors.sku?.message}>
          <Input id="sku" className="uppercase" {...form.register('sku')} />
        </FormField>
        <FormField
          id="barcode"
          label="Código de barras"
          error={errors.barcode?.message}
        >
          <Input
            id="barcode"
            inputMode="numeric"
            {...form.register('barcode')}
          />
        </FormField>
        <FormField id="unitId" label="Unidad" error={errors.unitId?.message}>
          <Select id="unitId" disabled={editing} {...form.register('unitId')}>
            <option value="">Selecciona…</option>
            {units.data
              ?.filter((u) => !u.archivedAt || u.id === product?.unitId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
          </Select>
        </FormField>
        <FormField
          id="categoryId"
          label="Categoría"
          error={errors.categoryId?.message}
        >
          <Select id="categoryId" {...form.register('categoryId')}>
            <option value="">Sin categoría</option>
            {categories.data
              ?.filter((c) => !c.archivedAt || c.id === product?.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField id="cost" label="Costo" error={errors.cost?.message}>
          <Input id="cost" inputMode="decimal" {...form.register('cost')} />
        </FormField>
        <FormField
          id="price"
          label="Precio de venta"
          error={errors.price?.message}
        >
          <Input id="price" inputMode="decimal" {...form.register('price')} />
        </FormField>
      </div>
      <FormField
        id="lowStockThreshold"
        label="Umbral de stock bajo"
        error={errors.lowStockThreshold?.message}
      >
        <Input
          id="lowStockThreshold"
          inputMode="decimal"
          {...form.register('lowStockThreshold')}
        />
      </FormField>
      <FormField
        id="description"
        label="Descripción"
        error={errors.description?.message}
      >
        <Textarea id="description" {...form.register('description')} />
      </FormField>
    </FormDialog>
  );
}
