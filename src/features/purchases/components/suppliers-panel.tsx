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
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useDebounced } from '@/lib/hooks/use-debounced';
import {
  optionalEmail,
  optionalText,
  requiredText,
} from '@/lib/schemas/common';
import {
  fetchSuppliers,
  purchasesPrefix,
  saveSupplier,
  suppliersKey,
} from '../api';
import type { Supplier } from '../types';

const LIMIT = 20;
const schema = z.object({
  name: requiredText('el nombre'),
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(300),
});
type Values = z.input<typeof schema>;

export function SuppliersPanel() {
  const { organizationId } = useOrganization();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [archived, setArchived] = useState(false);
  const q = useDebounced(text.trim());
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const params = {
    page,
    limit: LIMIT,
    q: q || undefined,
    status: archived ? 'archived' : undefined,
  };
  const query = useQuery({
    queryKey: suppliersKey(organizationId, params),
    queryFn: ({ signal }) => fetchSuppliers(organizationId, params, signal),
  });
  const toggle = useApiMutation({
    mutationFn: (s: Supplier) =>
      saveSupplier(organizationId, { archived: !s.archivedAt }, s.id),
    invalidate: [purchasesPrefix(organizationId)],
    successMessage: 'Proveedor actualizado',
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar proveedor"
          placeholder="Buscar proveedor"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Button
          variant={archived ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setArchived(!archived);
            setPage(1);
          }}
        >
          {archived ? 'Viendo archivados' : 'Ver archivados'}
        </Button>
        <Button className="ml-auto" onClick={() => setEditing('new')}>
          Nuevo proveedor
        </Button>
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyBlock
            title="Sin proveedores"
            description="Registra a quién le compras para crear órdenes de compra."
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Proveedor</TH>
                  <TH>Contacto</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <span className="font-medium">{s.name}</span>{' '}
                      {s.archivedAt ? <Badge>Archivado</Badge> : null}
                      {s.address ? (
                        <span className="block text-xs text-muted-foreground">
                          {s.address}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      {[s.email, s.phone].filter(Boolean).join(' · ') || '—'}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {!s.archivedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(s)}
                          >
                            Editar
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(s)}
                        >
                          {s.archivedAt ? 'Restaurar' : 'Archivar'}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={data.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
      <SupplierDialog editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function SupplierDialog({
  editing,
  onClose,
}: {
  editing: Supplier | 'new' | null;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const supplier = editing && editing !== 'new' ? editing : null;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', address: '' },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (editing === null) return;
    form.reset({
      name: supplier?.name ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      address: supplier?.address ?? '',
    });
  }, [editing, supplier, form]);

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      return saveSupplier(
        organizationId,
        {
          name: v.name,
          email: v.email ?? null,
          phone: v.phone ?? null,
          address: v.address ?? null,
        },
        supplier?.id,
      );
    },
    invalidate: [purchasesPrefix(organizationId)],
    successMessage: supplier ? 'Proveedor actualizado' : 'Proveedor creado',
    onSuccess: onClose,
  });

  return (
    <FormDialog
      open={editing !== null}
      onClose={onClose}
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id="s-name" label="Nombre" error={errors.name?.message}>
        <Input id="s-name" {...form.register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="s-email" label="Correo" error={errors.email?.message}>
          <Input id="s-email" type="email" {...form.register('email')} />
        </FormField>
        <FormField id="s-phone" label="Teléfono" error={errors.phone?.message}>
          <Input id="s-phone" {...form.register('phone')} />
        </FormField>
      </div>
      <FormField
        id="s-address"
        label="Dirección"
        error={errors.address?.message}
      >
        <Input id="s-address" {...form.register('address')} />
      </FormField>
    </FormDialog>
  );
}
