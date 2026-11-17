'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Dialog } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { Input } from '@/components/ui/forms/input';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { todayIn } from '@/lib/dates';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { auditKey, fetchAudit, fetchMemberNames } from '../api';
import type { AuditEvent } from '../types';

const LIMIT = 20;

export function AuditView() {
  const { organizationId, dateTime, timeZone } = useOrganization();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const q = useDebounced(text.trim());
  const params = {
    page,
    limit: LIMIT,
    q: q || undefined,
    fromDay: from || undefined,
    toDay: to || undefined,
  };
  const events = useQuery({
    queryKey: auditKey(organizationId, params),
    queryFn: ({ signal }) => fetchAudit(organizationId, params, signal),
  });
  const names = useQuery({
    queryKey: ['organizations', organizationId, 'audit', 'members'],
    queryFn: ({ signal }) => fetchMemberNames(organizationId, signal),
    staleTime: 5 * 60_000,
  });
  const actor = (id: string | null) =>
    id ? (names.data?.get(id) ?? 'Usuario') : 'Sistema';

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro de las operaciones sensibles. No contiene contraseñas ni tokens."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input
          aria-label="Filtrar por acción"
          placeholder="Acción (p. ej. sale.confirmed)"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPage(1);
          }}
        />
        <DatePicker
          aria-label="Desde"
          value={from}
          today={todayIn(timeZone)}
          onChange={(day) => {
            setFrom(day);
            setPage(1);
          }}
        />
        <DatePicker
          aria-label="Hasta"
          value={to}
          today={todayIn(timeZone)}
          onChange={(day) => {
            setTo(day);
            setPage(1);
          }}
        />
      </div>
      <QueryState
        query={events}
        isEmpty={(d) => d.items.length === 0}
        empty={<EmptyBlock title="Sin eventos" />}
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Usuario</TH>
                  <TH>Acción</TH>
                  <TH>Recurso</TH>
                  <TH>
                    <span className="sr-only">Detalle</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((e) => (
                  <TR key={e.id}>
                    <TD>{dateTime(e.createdAt)}</TD>
                    <TD>{actor(e.actorId)}</TD>
                    <TD className="font-mono text-xs">{e.action}</TD>
                    <TD>
                      {e.resourceType}
                      <span className="block text-xs text-muted-foreground">
                        {e.resourceId.slice(0, 8)}…
                      </span>
                    </TD>
                    <TD>
                      {e.changes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(e)}
                        >
                          Ver cambios
                        </Button>
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
      <Dialog
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.action ?? 'Detalle'}
        description={detail ? `Solicitud ${detail.requestId}` : undefined}
      >
        <pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(detail?.changes, null, 2)}
        </pre>
      </Dialog>
    </>
  );
}
