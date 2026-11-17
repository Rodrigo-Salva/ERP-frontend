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
import { Tabs } from '@/components/ui/data/tabs';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import type { Category, Unit } from '@/lib/api/types';
import { referenceKeys } from '@/lib/queries/reference';
import { requiredText } from '@/lib/schemas/common';
import {
  createTaxonomy,
  fetchTaxonomy,
  setTaxonomyArchived,
  updateTaxonomy,
  type TaxonomyKind,
} from '../api';

type Item = Category | Unit;

const categorySchema = z.object({
  name: requiredText('el nombre', 120),
  code: z.string(),
  precision: z.string(),
});
const unitSchema = z.object({
  name: requiredText('el nombre', 80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9_-]{0,19}$/,
      'Solo letras, números, guion y guion bajo (máx. 20)',
    ),
  precision: z.string().regex(/^[0-3]$/, 'Entre 0 y 3'),
});
type Values = z.input<typeof unitSchema>;

export function TaxonomyView() {
  return (
    <>
      <PageHeader
        title="Categorías y unidades"
        description="Organiza el catálogo y define cómo se miden los artículos."
      />
      <Tabs
        tabs={[
          {
            key: 'categories',
            label: 'Categorías',
            content: <List kind="categories" />,
          },
          {
            key: 'units',
            label: 'Unidades de medida',
            content: <List kind="units" />,
          },
        ]}
      />
    </>
  );
}

const LIMIT = 20;

function List({ kind }: { kind: TaxonomyKind }) {
  const { organizationId, isManager } = useOrganization();
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const isUnit = kind === 'units';
  const query = useQuery({
    queryKey: ['organizations', organizationId, 'taxonomy', kind, status, page],
    queryFn: ({ signal }) =>
      fetchTaxonomy<Item>(
        organizationId,
        kind,
        { page, limit: LIMIT, status },
        signal,
      ),
  });
  const refresh = [
    ['organizations', organizationId, 'taxonomy', kind],
    referenceKeys[kind](organizationId),
  ];

  const archive = useApiMutation({
    mutationFn: (item: Item) =>
      setTaxonomyArchived(organizationId, kind, item.id, !item.archivedAt),
    invalidate: refresh,
    successMessage: 'Actualizado',
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Estado">
          {(['active', 'archived'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? 'primary' : 'outline'}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s === 'active' ? 'Activas' : 'Archivadas'}
            </Button>
          ))}
        </div>
        {isManager ? (
          <Button onClick={() => setEditing('new')}>
            {isUnit ? 'Nueva unidad' : 'Nueva categoría'}
          </Button>
        ) : null}
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={<EmptyBlock title="Nada por aquí todavía" />}
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  {isUnit ? <TH>Código</TH> : null}
                  <TH>Nombre</TH>
                  {isUnit ? <TH numeric>Decimales</TH> : null}
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((item) => (
                  <TR key={item.id}>
                    {isUnit ? <TD>{(item as Unit).code}</TD> : null}
                    <TD>
                      {item.name}{' '}
                      {item.archivedAt ? <Badge>Archivada</Badge> : null}
                    </TD>
                    {isUnit ? (
                      <TD numeric>{(item as Unit).precision}</TD>
                    ) : null}
                    <TD>
                      {isManager ? (
                        <div className="flex justify-end gap-1">
                          {!item.archivedAt ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(item)}
                            >
                              Editar
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={archive.isPending}
                            onClick={() => archive.mutate(item)}
                          >
                            {item.archivedAt ? 'Restaurar' : 'Archivar'}
                          </Button>
                        </div>
                      ) : null}
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
      <ItemDialog
        kind={kind}
        editing={editing}
        refresh={refresh}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ItemDialog({
  kind,
  editing,
  refresh,
  onClose,
}: {
  kind: TaxonomyKind;
  editing: Item | 'new' | null;
  refresh: readonly (readonly unknown[])[];
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const isUnit = kind === 'units';
  const item = editing && editing !== 'new' ? editing : null;
  const form = useForm<Values>({
    resolver: zodResolver(isUnit ? unitSchema : categorySchema),
    defaultValues: { name: '', code: '', precision: '0' },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (editing === null) return;
    form.reset({
      name: item?.name ?? '',
      code: (item as Unit | null)?.code ?? '',
      precision: String((item as Unit | null)?.precision ?? 0),
    });
  }, [editing, item, form]);

  const mutation = useApiMutation({
    mutationFn: (raw: Values) => {
      const body = isUnit
        ? {
            name: raw.name.trim(),
            code: raw.code.trim().toUpperCase(),
            precision: Number(raw.precision),
          }
        : { name: raw.name.trim() };
      return item
        ? updateTaxonomy(organizationId, kind, item.id, body)
        : createTaxonomy(organizationId, kind, body);
    },
    invalidate: [...refresh],
    successMessage: item ? 'Cambios guardados' : 'Creado',
    onSuccess: onClose,
  });

  return (
    <FormDialog
      open={editing !== null}
      onClose={onClose}
      title={`${item ? 'Editar' : 'Nueva'} ${isUnit ? 'unidad' : 'categoría'}`}
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id="t-name" label="Nombre" error={errors.name?.message}>
        <Input id="t-name" {...form.register('name')} />
      </FormField>
      {isUnit ? (
        <>
          <FormField id="t-code" label="Código" error={errors.code?.message}>
            <Input
              id="t-code"
              className="uppercase"
              {...form.register('code')}
            />
          </FormField>
          <FormField
            id="t-precision"
            label="Decimales permitidos (0–3)"
            error={errors.precision?.message}
          >
            <Input
              id="t-precision"
              inputMode="numeric"
              {...form.register('precision')}
            />
          </FormField>
        </>
      ) : null}
    </FormDialog>
  );
}
