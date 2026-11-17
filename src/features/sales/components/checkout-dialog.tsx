'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { LoadingBlock } from '@/components/ui/data/query-state';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import {
  addDecimal,
  compareDecimal,
  isDecimal,
  negateDecimal,
  subtractDecimal,
} from '@/lib/decimal';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { cashKeys } from '@/lib/queries/cash';
import { usePaymentMethods } from '@/lib/queries/reference';
import { confirmSale } from '../api';
import type { Sale } from '../types';

interface PaymentRow {
  methodId: string;
  amount: string;
}

interface CheckoutDialogProps {
  /** Borrador creado por el servidor, con los totales oficiales. */
  draft: Sale | null;
  onClose: () => void;
  onPaid: (sale: Sale) => void;
}

export function CheckoutDialog({
  draft,
  onClose,
  onPaid,
}: CheckoutDialogProps) {
  return (
    <Dialog
      open={draft !== null}
      onClose={onClose}
      title="Cobrar venta"
      className="w-[min(92vw,34rem)]"
      confirmOnClose
    >
      {(requestClose) =>
        draft ? (
          <CheckoutBody
            key={draft.id}
            draft={draft}
            onCancel={requestClose}
            onPaid={onPaid}
          />
        ) : null
      }
    </Dialog>
  );
}

function CheckoutBody({
  draft,
  onCancel,
  onPaid,
}: {
  draft: Sale;
  onCancel: () => void;
  onPaid: (sale: Sale) => void;
}) {
  const { organizationId, money } = useOrganization();
  const methods = usePaymentMethods(organizationId);
  const idem = useIdempotency();
  const active = methods.data?.filter((m) => !m.archivedAt) ?? [];
  const [rows, setRows] = useState<PaymentRow[]>([]);

  // Primera fila por defecto: efectivo (o el primer método) por el total exacto.
  const effective: PaymentRow[] =
    rows.length > 0 || active.length === 0
      ? rows
      : [
          {
            methodId: (active.find((m) => m.isCash) ?? active[0]!).id,
            amount: draft.total,
          },
        ];

  const valid = effective.every(
    (r) =>
      r.methodId && isDecimal(r.amount) && compareDecimal(r.amount, '0') > 0,
  );
  const tendered = effective.reduce(
    (sum, r) => (isDecimal(r.amount) ? addDecimal(sum, r.amount) : sum),
    '0',
  );
  const diff = subtractDecimal(tendered, draft.total); // >=0 sobra (cambio), <0 falta
  const enough = compareDecimal(diff, '0') >= 0;
  const methodOf = (id: string) => active.find((m) => m.id === id);
  const cashTendered = effective
    .filter((r) => methodOf(r.methodId)?.isCash && isDecimal(r.amount))
    .reduce((sum, r) => addDecimal(sum, r.amount), '0');
  // El cambio solo puede salir del efectivo recibido.
  const changeOk =
    compareDecimal(diff, '0') <= 0 || compareDecimal(diff, cashTendered) <= 0;

  function update(index: number, patch: Partial<PaymentRow>) {
    setRows(
      effective.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  const mutation = useApiMutation({
    mutationFn: () => {
      const payments = effective.map((r) => ({
        methodId: r.methodId,
        amount: r.amount,
      }));
      return confirmSale(
        organizationId,
        draft.id,
        payments,
        idem.keyFor({ id: draft.id, payments }),
      );
    },
    invalidate: [
      ['organizations', organizationId, 'sales'],
      ['organizations', organizationId, 'inventory'],
      ['organizations', organizationId, 'dashboard'],
      cashKeys.all(organizationId),
    ],
    onSuccess: (sale) => {
      idem.renew();
      onPaid(sale);
    },
  });

  // Sin los métodos de pago no hay nada que cobrar todavía.
  if (methods.isPending)
    return <LoadingBlock label="Cargando métodos de pago" />;

  const unused = active.filter(
    (m) => !effective.some((r) => r.methodId === m.id),
  );

  return (
    <div className="space-y-4">
      <dl className="space-y-1 rounded-md bg-muted p-3 text-sm">
        <Line label="Subtotal" value={money(draft.gross)} />
        {compareDecimal(draft.discount, '0') > 0 ? (
          <Line label="Descuento" value={`-${money(draft.discount)}`} />
        ) : null}
        <Line
          label={`Impuestos (${Number(draft.taxRate)}% ${draft.taxIncluded ? 'incluidos' : 'agregados'})`}
          value={money(draft.tax)}
        />
        <Line label="Total a cobrar" value={money(draft.total)} strong />
      </dl>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Pagos</legend>
        {effective.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              aria-label="Método de pago"
              value={row.methodId}
              onChange={(e) => update(index, { methodId: e.target.value })}
            >
              {active
                .filter((m) => m.id === row.methodId || unused.includes(m))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
            <Input
              aria-label="Importe"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => update(index, { amount: e.target.value })}
              className="w-32 text-right"
            />
            {effective.length > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Quitar pago"
                onClick={() => setRows(effective.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
        {unused.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRows([...effective, { methodId: unused[0]!.id, amount: '' }])
            }
          >
            <Plus aria-hidden className="size-4" /> Agregar método
          </Button>
        ) : null}
      </fieldset>

      <p className="text-sm" aria-live="polite">
        {!valid
          ? 'Revisa los importes de pago.'
          : !enough
            ? `Faltan ${money(negateDecimal(diff))}`
            : !changeOk
              ? 'El excedente solo puede devolverse si se recibió en efectivo.'
              : compareDecimal(diff, '0') > 0
                ? `Cambio a entregar: ${money(diff)}`
                : 'Pago exacto.'}
      </p>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !valid || !enough || !changeOk}
        >
          {mutation.isPending ? 'Confirmando…' : 'Confirmar venta'}
        </Button>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${strong ? 'text-base font-semibold' : ''}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
