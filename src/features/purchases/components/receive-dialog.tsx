'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { Input } from '@/components/ui/forms/input';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { compareDecimal, isDecimal, subtractDecimal } from '@/lib/decimal';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { formatQuantity } from '@/lib/money';
import {
  money as moneySchema,
  quantity as quantitySchema,
} from '@/lib/schemas/common';
import { purchasesPrefix, receiveOrder } from '../api';
import type { PurchaseOrder } from '../types';

export function ReceiveDialog({
  order,
  onClose,
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={order !== null}
      onClose={onClose}
      title="Recibir mercadería"
      description="Indica lo que llegó y su costo real. Puedes recibir en varias entregas."
      className="w-[min(94vw,46rem)]"
      confirmOnClose
    >
      {(requestClose) =>
        order ? (
          <Body
            key={order.id}
            order={order}
            onClose={onClose}
            onCancel={requestClose}
          />
        ) : null
      }
    </Dialog>
  );
}

function Body({
  order,
  onClose,
  onCancel,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onCancel: () => void;
}) {
  const { organizationId, locale } = useOrganization();
  const idem = useIdempotency();
  const pending = (lineId: string) => {
    const line = order.lines.find((l) => l.id === lineId)!;
    return subtractDecimal(line.quantity, line.received);
  };
  const [rows, setRows] = useState<
    Record<string, { quantity: string; unitCost: string }>
  >(() =>
    Object.fromEntries(
      order.lines.map((l) => [
        l.id,
        {
          quantity: subtractDecimal(l.quantity, l.received),
          unitCost: l.unitCost,
        },
      ]),
    ),
  );

  const chosen = order.lines
    .map((l) => ({ line: l, row: rows[l.id]! }))
    .filter(
      ({ row }) =>
        isDecimal(row.quantity) && compareDecimal(row.quantity, '0') > 0,
    );
  const invalid = chosen.some(
    ({ line, row }) =>
      !quantitySchema.safeParse(row.quantity).success ||
      !moneySchema.safeParse(row.unitCost).success ||
      compareDecimal(row.quantity, pending(line.id)) > 0,
  );

  const mutation = useApiMutation({
    mutationFn: () => {
      const body = {
        lines: chosen.map(({ line, row }) => ({
          lineId: line.id,
          quantity: row.quantity,
          unitCost: row.unitCost,
        })),
      };
      return receiveOrder(organizationId, order.id, body, idem.keyFor(body));
    },
    invalidate: [
      purchasesPrefix(organizationId),
      ['organizations', organizationId, 'inventory'],
    ],
    successMessage: 'Recepción registrada',
    onSuccess: () => {
      idem.renew();
      onClose();
    },
  });

  return (
    <div className="space-y-3">
      {order.lines.map((line) => {
        const left = pending(line.id);
        const row = rows[line.id]!;
        const done = compareDecimal(left, '0') <= 0;
        return (
          <div
            key={line.id}
            className="grid items-center gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_6rem_7rem]"
          >
            <div className="text-sm">
              <p className="font-medium">{line.name ?? line.sku}</p>
              <p className="text-xs text-muted-foreground">
                Pedidas {formatQuantity(line.quantity, locale)} · recibidas{' '}
                {formatQuantity(line.received, locale)} · pendientes{' '}
                {formatQuantity(left, locale)}
              </p>
            </div>
            <Input
              aria-label={`Cantidad recibida de ${line.name ?? line.sku}`}
              inputMode="decimal"
              disabled={done}
              value={done ? '0' : row.quantity}
              aria-invalid={
                isDecimal(row.quantity) &&
                compareDecimal(row.quantity, left) > 0
              }
              onChange={(e) =>
                setRows({
                  ...rows,
                  [line.id]: { ...row, quantity: e.target.value },
                })
              }
              className="text-right"
            />
            <Input
              aria-label={`Costo real de ${line.name ?? line.sku}`}
              inputMode="decimal"
              disabled={done}
              value={row.unitCost}
              onChange={(e) =>
                setRows({
                  ...rows,
                  [line.id]: { ...row, unitCost: e.target.value },
                })
              }
              className="text-right"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        El costo recibido actualiza el costo promedio del inventario; las
        recepciones anteriores no cambian.
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
          disabled={chosen.length === 0 || invalid || mutation.isPending}
        >
          {mutation.isPending ? 'Registrando…' : 'Registrar recepción'}
        </Button>
      </div>
    </div>
  );
}
