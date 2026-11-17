'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { compareDecimal, isDecimal, subtractDecimal } from '@/lib/decimal';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { cashKeys, useOpenCashSessions } from '@/lib/queries/cash';
import { usePaymentMethods } from '@/lib/queries/reference';
import { formatQuantity } from '@/lib/money';
import { cancelSale, returnSale } from '../api';
import type { Sale } from '../types';

type Mode = 'return' | 'cancel';

interface Props {
  sale: Sale | null;
  mode: Mode;
  onClose: () => void;
}

export function ReturnDialog({ sale, mode, onClose }: Props) {
  return (
    <Dialog
      open={sale !== null}
      onClose={onClose}
      title={mode === 'return' ? 'Devolución' : 'Anular venta'}
      description={
        mode === 'return'
          ? 'Indica las cantidades a devolver y si el artículo vuelve al inventario.'
          : 'Se devuelve la venta completa. Esta acción queda auditada.'
      }
      className="w-[min(94vw,44rem)]"
      confirmOnClose
    >
      {(requestClose) =>
        sale ? (
          <Body
            key={`${sale.id}-${mode}`}
            sale={sale}
            mode={mode}
            onClose={onClose}
            onCancel={requestClose}
          />
        ) : null
      }
    </Dialog>
  );
}

function Body({
  sale,
  mode,
  onClose,
  onCancel,
}: {
  sale: Sale;
  mode: Mode;
  onClose: () => void;
  onCancel: () => void;
}) {
  const { organizationId, money, locale } = useOrganization();
  const methods = usePaymentMethods(organizationId);
  const sessions = useOpenCashSessions(organizationId);
  const idem = useIdempotency();
  const [methodId, setMethodId] = useState('');
  const [reason, setReason] = useState('');
  const [restockAll, setRestockAll] = useState(true);
  const [lines, setLines] = useState<
    Record<string, { quantity: string; restock: boolean }>
  >({});

  const active = methods.data?.filter((m) => !m.archivedAt) ?? [];
  const method = active.find((m) => m.id === methodId);
  const branchSession = sessions.data?.find(
    (s) => s.branchId === sale.branchId,
  );
  const pending = (lineId: string) => {
    const line = sale.lines.find((l) => l.id === lineId)!;
    return subtractDecimal(line.quantity, line.returned);
  };

  const chosen = sale.lines
    .map((l) => ({
      line: l,
      input: lines[l.id] ?? { quantity: '', restock: true },
    }))
    .filter(
      ({ input }) =>
        isDecimal(input.quantity) && compareDecimal(input.quantity, '0') > 0,
    );
  const overLimit = chosen.some(
    ({ line, input }) => compareDecimal(input.quantity, pending(line.id)) > 0,
  );
  const needsCash = Boolean(method?.isCash) && !branchSession;
  const reasonOk = reason.trim().length >= 3;
  const ready =
    methodId &&
    reasonOk &&
    !needsCash &&
    (mode === 'cancel' || (chosen.length > 0 && !overLimit));

  const mutation = useApiMutation({
    mutationFn: () => {
      const cashSessionId = method?.isCash ? branchSession?.id : undefined;
      if (mode === 'cancel') {
        const body = {
          reason: reason.trim(),
          methodId,
          cashSessionId,
          restock: restockAll,
        };
        return cancelSale(organizationId, sale.id, body, idem.keyFor(body));
      }
      const body = {
        methodId,
        cashSessionId,
        reason: reason.trim(),
        lines: chosen.map(({ line, input }) => ({
          lineId: line.id,
          quantity: input.quantity,
          restock: input.restock,
        })),
      };
      return returnSale(organizationId, sale.id, body, idem.keyFor(body));
    },
    invalidate: [
      ['organizations', organizationId, 'sales'],
      ['organizations', organizationId, 'inventory'],
      ['organizations', organizationId, 'dashboard'],
      cashKeys.all(organizationId),
    ],
    successMessage:
      mode === 'return' ? 'Devolución registrada' : 'Venta anulada',
    onSuccess: () => {
      idem.renew();
      onClose();
    },
  });

  return (
    <div className="space-y-4">
      {mode === 'return' ? (
        <div className="space-y-2">
          {sale.lines.map((line) => {
            const left = pending(line.id);
            const input = lines[line.id] ?? { quantity: '', restock: true };
            const disabled = compareDecimal(left, '0') <= 0;
            return (
              <div
                key={line.id}
                className="grid items-center gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_7rem_auto]"
              >
                <div className="text-sm">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Vendidas {formatQuantity(line.quantity, locale)} ·
                    pendientes {formatQuantity(left, locale)} ·{' '}
                    {money(line.price)} c/u
                  </p>
                </div>
                <Input
                  aria-label={`Cantidad a devolver de ${line.name}`}
                  inputMode="decimal"
                  placeholder="0"
                  disabled={disabled}
                  value={input.quantity}
                  aria-invalid={
                    isDecimal(input.quantity) &&
                    compareDecimal(input.quantity, left) > 0
                  }
                  onChange={(e) =>
                    setLines({
                      ...lines,
                      [line.id]: { ...input, quantity: e.target.value },
                    })
                  }
                  className="text-right"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={input.restock}
                    disabled={disabled}
                    onChange={(e) =>
                      setLines({
                        ...lines,
                        [line.id]: { ...input, restock: e.target.checked },
                      })
                    }
                  />
                  Reintegrar al inventario
                </label>
              </div>
            );
          })}
          {overLimit ? (
            <p role="alert" className="text-sm text-danger">
              Alguna cantidad supera lo pendiente de devolver.
            </p>
          ) : null}
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={restockAll}
            onChange={(e) => setRestockAll(e.target.checked)}
          />
          Reintegrar los artículos al inventario (desmarca si están dañados)
        </label>
      )}

      <FormField id="refund-method" label="Método de reembolso">
        <Select
          id="refund-method"
          value={methodId}
          onChange={(e) => setMethodId(e.target.value)}
        >
          <option value="">Selecciona…</option>
          {active.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </FormField>
      {needsCash ? (
        <p role="alert" className="text-sm text-danger">
          El reembolso en efectivo sale de una caja abierta de esta sucursal.
          Abre una caja primero.
        </p>
      ) : null}
      <FormField id="refund-reason" label="Motivo">
        <Input
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>

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
          disabled={!ready || mutation.isPending}
        >
          {mutation.isPending
            ? 'Procesando…'
            : mode === 'return'
              ? 'Registrar devolución'
              : 'Anular venta'}
        </Button>
      </div>
    </div>
  );
}
