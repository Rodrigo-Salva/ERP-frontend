'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Pagination } from '@/components/ui/data/pagination';
import { ClientPaged } from '@/components/ui/data/client-paged';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useWarehouses } from '@/lib/queries/reference';
import { formatQuantity } from '@/lib/money';
import { compareDecimal } from '@/lib/decimal';
import {
  fetchBalances,
  fetchLowStock,
  fetchMovements,
  inventoryKey,
} from '../api';
import { MOVEMENT_KINDS } from '../types';

const LIMIT = 20;

export function BalancesPanel({ branchId }: { branchId?: string }) {
  const { organizationId, money, canSeeCosts, locale } = useOrganization();
  const [page, setPage] = useState(1);
  const params = { page, limit: LIMIT, branchId };
  const query = useQuery({
    queryKey: inventoryKey(organizationId, 'balances', params),
    queryFn: ({ signal }) => fetchBalances(organizationId, params, signal),
  });
  return (
    <QueryState
      query={query}
      isEmpty={(d) => d.items.length === 0}
      empty={
        <EmptyBlock
          title="Aún no hay existencias"
          description="Recibe una compra o registra un ajuste para empezar."
        />
      }
    >
      {(data) => (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Artículo</TH>
                <TH>Almacén</TH>
                <TH numeric>Existencias</TH>
                {canSeeCosts ? <TH numeric>Valor</TH> : null}
              </TR>
            </THead>
            <tbody>
              {data.items.map((b) => (
                <TR key={b.id}>
                  <TD>
                    <span className="font-medium">{b.name ?? '—'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {b.sku}
                    </span>
                  </TD>
                  <TD>{b.warehouseName ?? '—'}</TD>
                  <TD numeric>{formatQuantity(b.quantity, locale)}</TD>
                  {canSeeCosts ? (
                    <TD numeric>{b.value ? money(b.value) : '—'}</TD>
                  ) : null}
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
  );
}

export function MovementsPanel({ branchId }: { branchId?: string }) {
  const { organizationId, money, canSeeCosts, locale, dateTime } =
    useOrganization();
  const [page, setPage] = useState(1);
  const params = { page, limit: LIMIT, branchId };
  const query = useQuery({
    queryKey: inventoryKey(organizationId, 'movements', params),
    queryFn: ({ signal }) => fetchMovements(organizationId, params, signal),
  });
  return (
    <QueryState
      query={query}
      isEmpty={(d) => d.items.length === 0}
      empty={<EmptyBlock title="Sin movimientos todavía" />}
    >
      {(data) => (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Tipo</TH>
                <TH>Artículo</TH>
                <TH>Almacén</TH>
                <TH numeric>Cambio</TH>
                <TH numeric>Antes → Después</TH>
                {canSeeCosts ? <TH numeric>Costo unit.</TH> : null}
              </TR>
            </THead>
            <tbody>
              {data.items.map((m) => (
                <TR key={m.id}>
                  <TD>{dateTime(m.createdAt)}</TD>
                  <TD>
                    {MOVEMENT_KINDS[m.kind] ?? m.kind}
                    <span className="block text-xs text-muted-foreground">
                      {m.reason}
                    </span>
                  </TD>
                  <TD>
                    {m.name ?? '—'}
                    <span className="block text-xs text-muted-foreground">
                      {m.sku}
                    </span>
                  </TD>
                  <TD>{m.warehouseName ?? '—'}</TD>
                  <TD numeric>
                    <span
                      className={
                        compareDecimal(m.delta, '0') < 0 ? 'text-danger' : ''
                      }
                    >
                      {compareDecimal(m.delta, '0') > 0 ? '+' : ''}
                      {formatQuantity(m.delta, locale)}
                    </span>
                  </TD>
                  <TD numeric>
                    {formatQuantity(m.before, locale)} →{' '}
                    {formatQuantity(m.after, locale)}
                  </TD>
                  {canSeeCosts ? (
                    <TD numeric>{m.unitCost ? money(m.unitCost) : '—'}</TD>
                  ) : null}
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
  );
}

export function LowStockPanel() {
  const { organizationId, locale } = useOrganization();
  const warehouses = useWarehouses(organizationId);
  const [chosen, setChosen] = useState('');
  const warehouseId = chosen || warehouses.data?.[0]?.id || '';
  const query = useQuery({
    queryKey: inventoryKey(organizationId, 'low-stock', warehouseId),
    queryFn: ({ signal }) => fetchLowStock(organizationId, warehouseId, signal),
    enabled: warehouseId !== '',
  });

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Select
          aria-label="Almacén"
          value={warehouseId}
          onChange={(e) => setChosen(e.target.value)}
        >
          {warehouses.data?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </div>
      {warehouseId === '' ? (
        <EmptyBlock title="No hay almacenes" />
      ) : (
        <QueryState
          query={query}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyBlock
              title="Todo en orden"
              description="Ningún artículo está en o bajo su umbral."
            />
          }
        >
          {(all) => (
            <ClientPaged items={all}>
              {(items) => (
                <Table>
                  <THead>
                    <TR>
                      <TH>Artículo</TH>
                      <TH numeric>Existencias</TH>
                      <TH numeric>Umbral</TH>
                      <TH>Estado</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {items.map((item) => (
                      <TR key={item.variantId}>
                        <TD>
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {item.sku}
                          </span>
                        </TD>
                        <TD numeric>{formatQuantity(item.quantity, locale)}</TD>
                        <TD numeric>
                          {formatQuantity(item.threshold, locale)}
                        </TD>
                        <TD>
                          {compareDecimal(item.quantity, '0') <= 0 ? (
                            <Badge tone="danger">Sin stock</Badge>
                          ) : (
                            <Badge tone="warning">Stock bajo</Badge>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </ClientPaged>
          )}
        </QueryState>
      )}
    </div>
  );
}
