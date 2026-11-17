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
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import type { Customer } from '@/lib/api/types';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { referenceKeys } from '@/lib/queries/reference';
import {
  optionalEmail,
  optionalText,
  requiredText,
} from '@/lib/schemas/common';
import {
  customersKey,
  customersPrefix,
  fetchCustomers,
  saveCustomer,
} from '../api';

const LIMIT = 20;
const schema = z.object({
  name: requiredText('el nombre'),
  email: optionalEmail,
  phone: optionalText(40),
  consent: z
    .boolean()
    .refine(
      (v) => v,
      'Se requiere el consentimiento para guardar datos personales',
    ),
});
type Values = z.input<typeof schema>;

export function CustomersView() {
  const { organizationId, dateTime } = useOrganization();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [archived, setArchived] = useState(false);
  const q = useDebounced(text.trim());
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const params = {
    page,
    limit: LIMIT,
    q: q || undefined,
    status: archived ? 'archived' : undefined,
  };
  const query = useQuery({
    queryKey: customersKey(organizationId, params),
    queryFn: ({ signal }) => fetchCustomers(organizationId, params, signal),
  });
  const toggle = useApiMutation({
    mutationFn: (c: Customer) =>
      saveCustomer(organizationId, { archived: !c.archivedAt }, c.id),
    invalidate: [
      customersPrefix(organizationId),
      referenceKeys.customers(organizationId),
    ],
    successMessage: 'Cliente actualizado',
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Datos mínimos de clientes, con su consentimiento registrado."
        actions={
          <Button onClick={() => setEditing('new')}>Nuevo cliente</Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar cliente"
          placeholder="Buscar por nombre"
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
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyBlock
            title="Sin clientes"
            description="Las ventas pueden hacerse sin cliente; regístralo solo si lo necesitas."
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Contacto</TH>
                  <TH>Consentimiento</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <span className="font-medium">{c.name}</span>{' '}
                      {c.archivedAt ? <Badge>Archivado</Badge> : null}
                    </TD>
                    <TD>
                      {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                    </TD>
                    <TD>{dateTime(c.consentAt)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {!c.archivedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(c)}
                          >
                            Editar
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(c)}
                        >
                          {c.archivedAt ? 'Restaurar' : 'Archivar'}
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
      <CustomerDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function CustomerDialog({
  editing,
  onClose,
}: {
  editing: Customer | 'new' | null;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const customer = editing && editing !== 'new' ? editing : null;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', consent: false },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (editing === null) return;
    form.reset({
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      // Un cliente existente ya dio su consentimiento al registrarse.
      consent: customer !== null,
    });
  }, [editing, customer, form]);

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const v = schema.parse(raw);
      const body = {
        name: v.name,
        email: v.email ?? null,
        phone: v.phone ?? null,
      };
      return saveCustomer(
        organizationId,
        customer ? body : { ...body, consent: true },
        customer?.id,
      );
    },
    invalidate: [
      customersPrefix(organizationId),
      referenceKeys.customers(organizationId),
    ],
    successMessage: customer ? 'Cliente actualizado' : 'Cliente registrado',
    onSuccess: onClose,
  });

  return (
    <FormDialog
      open={editing !== null}
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id="c-name" label="Nombre" error={errors.name?.message}>
        <Input id="c-name" {...form.register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="c-email" label="Correo" error={errors.email?.message}>
          <Input id="c-email" type="email" {...form.register('email')} />
        </FormField>
        <FormField id="c-phone" label="Teléfono" error={errors.phone?.message}>
          <Input id="c-phone" {...form.register('phone')} />
        </FormField>
      </div>
      {!customer ? (
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              {...form.register('consent')}
            />
            El cliente autoriza que se guarden sus datos personales para
            gestionar sus compras.
          </label>
          {errors.consent ? (
            <p role="alert" className="text-sm text-danger">
              {errors.consent.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </FormDialog>
  );
}
