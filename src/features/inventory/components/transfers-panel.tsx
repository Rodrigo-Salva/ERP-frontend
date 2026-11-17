'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge, type BadgeTone } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { VariantPicker } from '@/components/shared/variant-picker';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { useWarehouses } from '@/lib/queries/reference';
import { formatQuantity } from '@/lib/money';
import { quantity, reason } from '@/lib/schemas/common';
import {
  createTransfer,
  fetchTransfers,
  inventoryKey,
  inventoryPrefix,
  transitionTransfer,
} from '../api';
import { TRANSFER_LABELS, type Transfer, type TransferStatus } from '../types';

const LIMIT = 20;
const TONES: Record<TransferStatus, BadgeTone> = {
  DRAFT: 'neutral',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export function TransfersPanel() {
  const { organizationId, locale, dateTime } = useOrganization();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const idem = useIdempotency();
  const params = { page, limit: LIMIT };
  const query = useQuery({
    queryKey: inventoryKey(organizationId, 'transfers', params),
    queryFn: ({ signal }) => fetchTransfers(organizationId, params, signal),
  });

  const move = useApiMutation({
    mutationFn: ({
      transfer,
      action,
    }: {
      transfer: Transfer;
      action: 'send' | 'receive' | 'cancel';
    }) =>
      transitionTransfer(
        organizationId,
        transfer.id,
        action,
        idem.keyFor({ id: transfer.id, action }),
      ),
    invalidate: [inventoryPrefix(organizationId)],
    successMessage: 'Transferencia actualizada',
    onSuccess: () => idem.renew(),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Nueva transferencia</Button>
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyBlock
            title="Sin transferencias"
            description="Mueve existencias entre almacenes o sucursales."
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Ruta</TH>
                  <TH>Artículos</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((t) => (
                  <TR key={t.id}>
                    <TD>{dateTime(t.createdAt)}</TD>
                    <TD>
                      {t.sourceWarehouseName ?? '—'} →{' '}
                      {t.targetWarehouseName ?? '—'}
                      <span className="block text-xs text-muted-foreground">
                        {t.reason}
                      </span>
                    </TD>
                    <TD>
                      {t.lines.map((l) => (
                        <span key={l.variantId} className="block">
                          {formatQuantity(l.quantity, locale)} ×{' '}
                          {l.name ?? l.sku}
                        </span>
                      ))}
                    </TD>
                    <TD>
                      <Badge tone={TONES[t.status]}>
                        {TRANSFER_LABELS[t.status]}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {t.status === 'DRAFT' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={move.isPending}
                            onClick={() =>
                              move.mutate({ transfer: t, action: 'send' })
                            }
                          >
                            Enviar
                          </Button>
                        ) : null}
                        {t.status === 'IN_TRANSIT' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={move.isPending}
                            onClick={() =>
                              move.mutate({ transfer: t, action: 'receive' })
                            }
                          >
                            Recibir
                          </Button>
                        ) : null}
                        {t.status === 'DRAFT' || t.status === 'IN_TRANSIT' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={move.isPending}
                            onClick={() =>
                              move.mutate({ transfer: t, action: 'cancel' })
                            }
                          >
                            Cancelar
                          </Button>
                        ) : null}
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
      <TransferDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

const schema = z
  .object({
    sourceWarehouseId: z.string().min(1, 'Elige el origen'),
    targetWarehouseId: z.string().min(1, 'Elige el destino'),
    reason,
  })
  .refine((v) => v.sourceWarehouseId !== v.targetWarehouseId, {
    path: ['targetWarehouseId'],
    message: 'Origen y destino deben ser distintos',
  });
type Values = z.infer<typeof schema>;

interface Line {
  variantId: string;
  label: string;
  quantity: string;
}

function TransferDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const warehouses = useWarehouses(organizationId);
  const [lines, setLines] = useState<Line[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { sourceWarehouseId: '', targetWarehouseId: '', reason: '' },
  });
  const errors = form.formState.errors;
  const validLines =
    lines.length > 0 &&
    lines.every((l) => quantity.safeParse(l.quantity).success);

  const mutation = useApiMutation({
    mutationFn: (values: Values) =>
      createTransfer(organizationId, {
        ...values,
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
        })),
      }),
    invalidate: [inventoryPrefix(organizationId)],
    successMessage: 'Transferencia creada (borrador)',
    onSuccess: () => {
      form.reset();
      setLines([]);
      onClose();
    },
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nueva transferencia"
      description="Se crea en borrador; al enviarla, el stock sale del origen y queda en tránsito."
      pending={mutation.isPending}
      onSubmit={form.handleSubmit(
        (values) => validLines && mutation.mutate(values),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="tr-source"
          label="Origen"
          error={errors.sourceWarehouseId?.message}
        >
          <Select id="tr-source" {...form.register('sourceWarehouseId')}>
            <option value="">Selecciona…</option>
            {warehouses.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="tr-target"
          label="Destino"
          error={errors.targetWarehouseId?.message}
        >
          <Select id="tr-target" {...form.register('targetWarehouseId')}>
            <option value="">Selecciona…</option>
            {warehouses.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField id="tr-reason" label="Motivo" error={errors.reason?.message}>
        <Input id="tr-reason" {...form.register('reason')} />
      </FormField>

      <div className="space-y-2">
        <span className="text-sm font-medium">Artículos</span>
        <VariantPicker
          onPick={(v) =>
            setLines((current) =>
              current.some((l) => l.variantId === v.id)
                ? current
                : [
                    ...current,
                    { variantId: v.id, label: v.label, quantity: '1' },
                  ],
            )
          }
        />
        {lines.map((line) => (
          <div key={line.variantId} className="flex items-center gap-2">
            <span className="flex-1 text-sm">{line.label}</span>
            <Input
              aria-label={`Cantidad de ${line.label}`}
              inputMode="decimal"
              value={line.quantity}
              aria-invalid={!quantity.safeParse(line.quantity).success}
              onChange={(e) =>
                setLines(
                  lines.map((l) =>
                    l.variantId === line.variantId
                      ? { ...l, quantity: e.target.value }
                      : l,
                  ),
                )
              }
              className="w-24 text-right"
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
    </FormDialog>
  );
}
