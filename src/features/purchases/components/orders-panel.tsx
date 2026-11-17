'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge, type BadgeTone } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { addDecimal, multiplyDecimal } from '@/lib/decimal';
import { formatQuantity } from '@/lib/money';
import {
  fetchOrders,
  ordersKey,
  purchasesPrefix,
  transitionOrder,
} from '../api';
import {
  PURCHASE_LABELS,
  type PurchaseOrder,
  type PurchaseStatus,
} from '../types';
import { OrderDialog } from './order-dialog';
import { ReceiveDialog } from './receive-dialog';

const LIMIT = 20;
const TONES: Record<PurchaseStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PARTIAL: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export function OrdersPanel() {
  const { organizationId, money, dateTime, locale } = useOrganization();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const params = { page, limit: LIMIT, status: status || undefined };
  const query = useQuery({
    queryKey: ordersKey(organizationId, params),
    queryFn: ({ signal }) => fetchOrders(organizationId, params, signal),
  });

  const move = useApiMutation({
    mutationFn: ({
      order,
      action,
    }: {
      order: PurchaseOrder;
      action: 'send' | 'cancel';
    }) => transitionOrder(organizationId, order.id, action),
    invalidate: [purchasesPrefix(organizationId)],
    successMessage: 'Orden actualizada',
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Estado"
          className="max-w-xs"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(PURCHASE_LABELS) as PurchaseStatus[]).map((s) => (
            <option key={s} value={s}>
              {PURCHASE_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          Nueva orden de compra
        </Button>
      </div>
      <QueryState
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyBlock
            title="Sin órdenes de compra"
            description="Crea una para pedir mercadería a un proveedor."
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Proveedor</TH>
                  <TH>Artículos</TH>
                  <TH numeric>Total</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((order) => {
                  const total = order.lines.reduce(
                    (sum, l) =>
                      addDecimal(sum, multiplyDecimal(l.quantity, l.unitCost)),
                    '0',
                  );
                  return (
                    <TR key={order.id}>
                      <TD>{dateTime(order.createdAt)}</TD>
                      <TD>
                        {order.supplierName ?? '—'}
                        <span className="block text-xs text-muted-foreground">
                          {order.warehouseName}
                        </span>
                      </TD>
                      <TD>
                        {order.lines.map((l) => (
                          <span key={l.id} className="block">
                            {formatQuantity(l.received, locale)}/
                            {formatQuantity(l.quantity, locale)} ×{' '}
                            {l.name ?? l.sku}
                          </span>
                        ))}
                      </TD>
                      <TD numeric>{money(total)}</TD>
                      <TD>
                        <Badge tone={TONES[order.status]}>
                          {PURCHASE_LABELS[order.status]}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {order.status === 'DRAFT' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={move.isPending}
                              onClick={() =>
                                move.mutate({ order, action: 'send' })
                              }
                            >
                              Enviar
                            </Button>
                          ) : null}
                          {order.status === 'SENT' ||
                          order.status === 'PARTIAL' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReceiving(order)}
                            >
                              Recibir
                            </Button>
                          ) : null}
                          {order.status === 'DRAFT' ||
                          order.status === 'SENT' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={move.isPending}
                              onClick={() =>
                                move.mutate({ order, action: 'cancel' })
                              }
                            >
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
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
      <OrderDialog open={creating} onClose={() => setCreating(false)} />
      <ReceiveDialog order={receiving} onClose={() => setReceiving(null)} />
    </div>
  );
}
