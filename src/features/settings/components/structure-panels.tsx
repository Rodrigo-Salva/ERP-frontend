'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { ClientPaged } from '@/components/ui/data/client-paged';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import type { Branch, ExpenseCategory, PaymentMethod } from '@/lib/api/types';
import {
  referenceKeys,
  useBranches,
  useWarehouses,
} from '@/lib/queries/reference';
import { optionalText, requiredText } from '@/lib/schemas/common';
import {
  createWarehouse,
  fetchExpenseCategories,
  fetchPaymentMethods,
  saveBranch,
  saveExpenseCategory,
  savePaymentMethod,
  settingsKey,
  settingsPrefix,
} from '../api';

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9][A-Z0-9_-]{0,19}$/,
    'Hasta 20 caracteres: letras, números, guion y guion bajo',
  );

/* ------------------------------ Sucursales ------------------------------ */

const branchSchema = z.object({
  name: requiredText('el nombre'),
  code,
  address: optionalText(300),
  timeZone: requiredText('la zona horaria', 80),
});
type BranchValues = z.input<typeof branchSchema>;

export function BranchesPanel() {
  const { organizationId, timeZone } = useOrganization();
  const branches = useBranches(organizationId);
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const archive = useApiMutation({
    mutationFn: (b: Branch) =>
      saveBranch(organizationId, { archived: true }, b.id),
    invalidate: [
      referenceKeys.branches(organizationId),
      referenceKeys.warehouses(organizationId),
      referenceKeys.cashRegisters(organizationId),
    ],
    successMessage: 'Sucursal archivada',
  });
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>Nueva sucursal</Button>
      </div>
      <QueryState
        query={branches}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyBlock title="Sin sucursales" />}
      >
        {(all) => (
          <ClientPaged items={all}>
            {(items) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Sucursal</TH>
                    <TH>Código</TH>
                    <TH>Zona horaria</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <tbody>
                  {items.map((b) => (
                    <TR key={b.id}>
                      <TD>
                        <span className="font-medium">{b.name}</span>
                        {b.address ? (
                          <span className="block text-xs text-muted-foreground">
                            {b.address}
                          </span>
                        ) : null}
                      </TD>
                      <TD>{b.code}</TD>
                      <TD>{b.timeZone}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(b)}
                          >
                            Editar
                          </Button>
                          {items.length > 1 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={archive.isPending}
                              onClick={() => archive.mutate(b)}
                            >
                              Archivar
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
      <BranchDialog
        editing={editing}
        defaultTimeZone={timeZone}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function BranchDialog({
  editing,
  defaultTimeZone,
  onClose,
}: {
  editing: Branch | 'new' | null;
  defaultTimeZone: string;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const branch = editing && editing !== 'new' ? editing : null;
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      timeZone: defaultTimeZone,
    },
  });
  const errors = form.formState.errors;
  useEffect(() => {
    if (editing === null) return;
    form.reset({
      name: branch?.name ?? '',
      code: branch?.code ?? '',
      address: branch?.address ?? '',
      timeZone: branch?.timeZone ?? defaultTimeZone,
    });
  }, [editing, branch, defaultTimeZone, form]);
  const mutation = useApiMutation({
    mutationFn: (raw: BranchValues) => {
      const v = branchSchema.parse(raw);
      return saveBranch(
        organizationId,
        {
          name: v.name,
          code: v.code,
          address: v.address ?? null,
          timeZone: v.timeZone,
        },
        branch?.id,
      );
    },
    invalidate: [
      referenceKeys.branches(organizationId),
      referenceKeys.warehouses(organizationId),
      referenceKeys.cashRegisters(organizationId),
    ],
    successMessage: branch
      ? 'Sucursal actualizada'
      : 'Sucursal creada con su almacén y caja',
    onSuccess: onClose,
  });
  return (
    <FormDialog
      open={editing !== null}
      onClose={onClose}
      title={branch ? 'Editar sucursal' : 'Nueva sucursal'}
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
    >
      <FormField id="b-name" label="Nombre" error={errors.name?.message}>
        <Input id="b-name" {...form.register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="b-code" label="Código" error={errors.code?.message}>
          <Input id="b-code" className="uppercase" {...form.register('code')} />
        </FormField>
        <FormField
          id="b-tz"
          label="Zona horaria"
          error={errors.timeZone?.message}
        >
          <Input id="b-tz" {...form.register('timeZone')} />
        </FormField>
      </div>
      <FormField
        id="b-address"
        label="Dirección"
        error={errors.address?.message}
      >
        <Input id="b-address" {...form.register('address')} />
      </FormField>
    </FormDialog>
  );
}

/* ------------------------------- Almacenes ------------------------------ */

const warehouseSchema = z.object({
  branchId: z.string().min(1, 'Elige una sucursal'),
  name: requiredText('el nombre'),
  code,
});
type WarehouseValues = z.input<typeof warehouseSchema>;

export function WarehousesPanel() {
  const { organizationId } = useOrganization();
  const warehouses = useWarehouses(organizationId);
  const branches = useBranches(organizationId);
  const [open, setOpen] = useState(false);
  const form = useForm<WarehouseValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { branchId: '', name: '', code: '' },
  });
  const errors = form.formState.errors;
  const mutation = useApiMutation({
    mutationFn: (raw: WarehouseValues) =>
      createWarehouse(organizationId, warehouseSchema.parse(raw)),
    invalidate: [referenceKeys.warehouses(organizationId)],
    successMessage: 'Almacén creado',
    onSuccess: () => {
      form.reset();
      setOpen(false);
    },
  });
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>Nuevo almacén</Button>
      </div>
      <QueryState
        query={warehouses}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyBlock title="Sin almacenes" />}
      >
        {(all) => (
          <ClientPaged items={all}>
            {(items) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Almacén</TH>
                    <TH>Código</TH>
                    <TH>Sucursal</TH>
                  </TR>
                </THead>
                <tbody>
                  {items.map((w) => (
                    <TR key={w.id}>
                      <TD className="font-medium">{w.name}</TD>
                      <TD>{w.code}</TD>
                      <TD>
                        {branches.data?.find((b) => b.id === w.branchId)
                          ?.name ?? '—'}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </ClientPaged>
        )}
      </QueryState>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo almacén"
        pending={mutation.isPending}
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <FormField
          id="w-branch"
          label="Sucursal"
          error={errors.branchId?.message}
        >
          <Select id="w-branch" {...form.register('branchId')}>
            <option value="">Selecciona…</option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="w-name" label="Nombre" error={errors.name?.message}>
            <Input id="w-name" {...form.register('name')} />
          </FormField>
          <FormField id="w-code" label="Código" error={errors.code?.message}>
            <Input
              id="w-code"
              className="uppercase"
              {...form.register('code')}
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}

/* --------------------------- Métodos de pago ---------------------------- */

const methodSchema = z.object({
  name: requiredText('el nombre', 80),
  code,
  isCash: z.boolean(),
});
type MethodValues = z.input<typeof methodSchema>;

export function PaymentMethodsPanel() {
  const { organizationId } = useOrganization();
  const query = useQuery({
    queryKey: settingsKey(organizationId, 'payment-methods'),
    queryFn: ({ signal }) => fetchPaymentMethods(organizationId, signal),
    select: (page) => page.items,
  });
  const [editing, setEditing] = useState<PaymentMethod | 'new' | null>(null);
  const method = editing && editing !== 'new' ? editing : null;
  const form = useForm<MethodValues>({
    resolver: zodResolver(methodSchema),
    defaultValues: { name: '', code: '', isCash: false },
  });
  const errors = form.formState.errors;
  useEffect(() => {
    if (editing === null) return;
    form.reset({
      name: method?.name ?? '',
      code: method?.code ?? '',
      isCash: method?.isCash ?? false,
    });
  }, [editing, method, form]);
  const invalidate = [
    settingsPrefix(organizationId),
    referenceKeys.paymentMethods(organizationId),
  ];
  const mutation = useApiMutation({
    mutationFn: (raw: MethodValues) =>
      savePaymentMethod(organizationId, methodSchema.parse(raw), method?.id),
    invalidate,
    successMessage: 'Método de pago guardado',
    onSuccess: () => setEditing(null),
  });
  const archive = useApiMutation({
    mutationFn: (m: PaymentMethod) =>
      savePaymentMethod(organizationId, { archived: true }, m.id),
    invalidate,
    successMessage: 'Método archivado',
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Solo el efectivo aumenta el efectivo esperado en caja. No se guardan
          datos de tarjetas.
        </p>
        <Button onClick={() => setEditing('new')}>Nuevo método</Button>
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyBlock title="Sin métodos de pago" />}
      >
        {(all) => (
          <ClientPaged items={all}>
            {(items) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Método</TH>
                    <TH>Código</TH>
                    <TH>Tipo</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <tbody>
                  {items.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium">{m.name}</TD>
                      <TD>{m.code}</TD>
                      <TD>
                        {m.isCash ? (
                          <Badge tone="success">Efectivo</Badge>
                        ) : (
                          <Badge>Otro medio</Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(m)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={archive.isPending}
                            onClick={() => archive.mutate(m)}
                          >
                            Archivar
                          </Button>
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
      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={method ? 'Editar método de pago' : 'Nuevo método de pago'}
        pending={mutation.isPending}
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <FormField id="m-name" label="Nombre" error={errors.name?.message}>
          <Input id="m-name" {...form.register('name')} />
        </FormField>
        <FormField id="m-code" label="Código" error={errors.code?.message}>
          <Input id="m-code" className="uppercase" {...form.register('code')} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('isCash')} /> Es efectivo
          (entra y sale de la caja física)
        </label>
      </FormDialog>
    </div>
  );
}

/* ------------------------ Categorías de gasto --------------------------- */

const categorySchema = z.object({ name: requiredText('el nombre', 100) });
type CategoryValues = z.input<typeof categorySchema>;

export function ExpenseCategoriesPanel() {
  const { organizationId } = useOrganization();
  const query = useQuery({
    queryKey: settingsKey(organizationId, 'expense-categories'),
    queryFn: ({ signal }) => fetchExpenseCategories(organizationId, signal),
    select: (page) => page.items,
  });
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null);
  const category = editing && editing !== 'new' ? editing : null;
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });
  useEffect(() => {
    if (editing !== null) form.reset({ name: category?.name ?? '' });
  }, [editing, category, form]);
  const invalidate = [
    settingsPrefix(organizationId),
    referenceKeys.expenseCategories(organizationId),
  ];
  const mutation = useApiMutation({
    mutationFn: (raw: CategoryValues) =>
      saveExpenseCategory(
        organizationId,
        categorySchema.parse(raw),
        category?.id,
      ),
    invalidate,
    successMessage: 'Categoría guardada',
    onSuccess: () => setEditing(null),
  });
  const archive = useApiMutation({
    mutationFn: (c: ExpenseCategory) =>
      saveExpenseCategory(organizationId, { archived: true }, c.id),
    invalidate,
    successMessage: 'Categoría archivada',
  });
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>Nueva categoría</Button>
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyBlock title="Sin categorías de gasto" />}
      >
        {(all) => (
          <ClientPaged items={all}>
            {(items) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Categoría</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <tbody>
                  {items.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(c)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={archive.isPending}
                            onClick={() => archive.mutate(c)}
                          >
                            Archivar
                          </Button>
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
      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={category ? 'Editar categoría' : 'Nueva categoría de gasto'}
        pending={mutation.isPending}
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <FormField
          id="ec-name"
          label="Nombre"
          error={form.formState.errors.name?.message}
        >
          <Input id="ec-name" {...form.register('name')} />
        </FormField>
      </FormDialog>
    </div>
  );
}
