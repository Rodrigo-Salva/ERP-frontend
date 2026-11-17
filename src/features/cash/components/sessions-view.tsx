'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useCashRegisters } from '@/lib/queries/reference';
import type { CashSession } from '@/lib/queries/cash';
import { useSessionDetail, useSessions } from '../hooks';
import { CloseSessionDialog } from './close-session-dialog';
import { MovementDialog } from './movement-dialog';
import { OpenSessionDialog } from './open-session-dialog';
import { SessionDetailDialog } from './session-detail-dialog';

const LIMIT = 20;

export function SessionsView() {
  const { organizationId, money, dateTime, canSell, can } = useOrganization();
  const [page, setPage] = useState(1);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<CashSession | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const sessions = useSessions(organizationId, { page, limit: LIMIT });
  const registers = useCashRegisters(organizationId);
  const registerName = (id: string) =>
    registers.data?.find((r) => r.id === id)?.name ?? '—';
  const closingDetail = useSessionDetail(organizationId, closing?.id ?? null);

  return (
    <>
      <PageHeader
        title="Caja"
        description="Turnos de caja con apertura, movimientos de efectivo y cierre."
        actions={
          canSell ? (
            <Button onClick={() => setOpening(true)}>Abrir caja</Button>
          ) : null
        }
      />
      <QueryState
        query={sessions}
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyBlock
            title="Aún no hay turnos de caja"
            description="Abre una caja para empezar a vender."
          />
        }
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Apertura</TH>
                  <TH>Caja</TH>
                  <TH numeric>Fondo</TH>
                  <TH numeric>Esperado</TH>
                  <TH numeric>Contado</TH>
                  <TH numeric>Diferencia</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((session) => (
                  <TR key={session.id}>
                    <TD>{dateTime(session.createdAt)}</TD>
                    <TD>{registerName(session.cashRegisterId)}</TD>
                    <TD numeric>{money(session.opening)}</TD>
                    <TD numeric>
                      {session.expected ? money(session.expected) : '—'}
                    </TD>
                    <TD numeric>
                      {session.counted ? money(session.counted) : '—'}
                    </TD>
                    <TD numeric>
                      {session.difference ? money(session.difference) : '—'}
                    </TD>
                    <TD>
                      {session.closedAt ? (
                        <Badge>Cerrada</Badge>
                      ) : (
                        <Badge tone="success">Abierta</Badge>
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewing(session.id)}
                        >
                          Detalle
                        </Button>
                        {!session.closedAt && canSell ? (
                          <>
                            {can('cash.adjust') ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMoving(session.id)}
                              >
                                Movimiento
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setClosing(session)}
                            >
                              Cerrar
                            </Button>
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

      <OpenSessionDialog open={opening} onClose={() => setOpening(false)} />
      <CloseSessionDialog
        session={closing}
        expected={closingDetail.data?.currentExpected}
        onClose={() => setClosing(null)}
      />
      <MovementDialog sessionId={moving} onClose={() => setMoving(null)} />
      <SessionDetailDialog
        sessionId={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
