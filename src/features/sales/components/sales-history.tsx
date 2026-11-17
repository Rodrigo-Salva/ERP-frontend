'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge, type BadgeTone } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { Input } from '@/components/ui/forms/input';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { todayIn } from '@/lib/dates';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { useSales } from '../hooks';
import { STATUS_LABELS, type Sale, type SaleStatus } from '../types';
import { ReceiptDialog } from './receipt-view';
import { ReturnDialog } from './return-dialog';

const LIMIT = 20;
const TONES: Record<SaleStatus, BadgeTone> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  PARTIAL_RETURN: 'warning',
  RETURNED: 'warning',
};

export function SalesHistory() {
  const { organizationId, money, dateTime, canSell, can, timeZone } =
    useOrganization();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useDebounced(text.trim());
  const [receipt, setReceipt] = useState<string | null>(null);
  const [action, setAction] = useState<{
    sale: Sale;
    mode: 'return' | 'cancel';
  } | null>(null);

  const sales = useSales(organizationId, {
    page,
    limit: LIMIT,
    q: q || undefined,
    status: status || undefined,
    fromDay: from || undefined,
    toDay: to || undefined,
  });

  const reset = () => setPage(1);

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Consulta por folio, fecha y estado."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <Input
          aria-label="Buscar por folio"
          placeholder="Folio"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            reset();
          }}
        />
        <Select
          aria-label="Estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            reset();
          }}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as SaleStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <DatePicker
          aria-label="Desde"
          value={from}
          today={todayIn(timeZone)}
          onChange={(day) => {
            setFrom(day);
            reset();
          }}
        />
        <DatePicker
          aria-label="Hasta"
          value={to}
          today={todayIn(timeZone)}
          onChange={(day) => {
            setTo(day);
            reset();
          }}
        />
      </div>

      <QueryState
        query={sales}
        isEmpty={(d) => d.items.length === 0}
        empty={<EmptyBlock title="No hay ventas con esos filtros" />}
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Folio</TH>
                  <TH>Fecha</TH>
                  <TH>Estado</TH>
                  <TH>Pagos</TH>
                  <TH numeric>Total</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((sale) => (
                  <TR key={sale.id}>
                    <TD className="font-medium">{sale.folio ?? '—'}</TD>
                    <TD>{dateTime(sale.confirmedAt ?? sale.createdAt)}</TD>
                    <TD>
                      <Badge tone={TONES[sale.status]}>
                        {STATUS_LABELS[sale.status]}
                      </Badge>
                    </TD>
                    <TD>
                      {sale.payments.map((p) => p.methodName).join(', ') || '—'}
                    </TD>
                    <TD numeric>{money(sale.total)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {sale.confirmedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReceipt(sale.id)}
                          >
                            Recibo
                          </Button>
                        ) : null}
                        {canSell &&
                        ['CONFIRMED', 'PARTIAL_RETURN'].includes(
                          sale.status,
                        ) ? (
                          <>
                            {can('sales.return') ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setAction({ sale, mode: 'return' })
                                }
                              >
                                Devolver
                              </Button>
                            ) : null}
                            {can('sales.cancel') ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setAction({ sale, mode: 'cancel' })
                                }
                              >
                                Anular
                              </Button>
                            ) : null}
                          </>
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

      <ReceiptDialog saleId={receipt} onClose={() => setReceipt(null)} />
      <ReturnDialog
        sale={action?.sale ?? null}
        mode={action?.mode ?? 'return'}
        onClose={() => setAction(null)}
      />
    </>
  );
}
