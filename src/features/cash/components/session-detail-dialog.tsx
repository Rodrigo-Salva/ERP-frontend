'use client';

import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Dialog } from '@/components/ui/overlays/dialog';
import { QueryState } from '@/components/ui/data/query-state';
import { ClientPaged } from '@/components/ui/data/client-paged';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useSessionDetail } from '../hooks';
import { MOVEMENT_LABELS } from '../types';

export function SessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { organizationId, money, dateTime } = useOrganization();
  const query = useSessionDetail(organizationId, sessionId);

  return (
    <Dialog
      open={sessionId !== null}
      onClose={onClose}
      title="Detalle de caja"
      className="w-[min(94vw,52rem)]"
    >
      <QueryState query={query}>
        {(session) => (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Apertura</dt>
                <dd>{dateTime(session.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  {session.closedAt ? (
                    <Badge>Cerrada {dateTime(session.closedAt)}</Badge>
                  ) : (
                    <Badge tone="success">Abierta</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fondo inicial</dt>
                <dd className="tabular-nums">{money(session.opening)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {session.closedAt ? 'Esperado al cierre' : 'Esperado ahora'}
                </dt>
                <dd className="tabular-nums">
                  {money(session.currentExpected)}
                </dd>
              </div>
              {session.closedAt ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">Contado</dt>
                    <dd className="tabular-nums">
                      {money(session.counted ?? '0')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Diferencia</dt>
                    <dd className="tabular-nums">
                      {money(session.difference ?? '0')}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>

            <h3 className="text-sm font-semibold">Movimientos de efectivo</h3>
            {session.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin movimientos todavía.
              </p>
            ) : (
              <ClientPaged items={session.movements} size={8}>
                {(rows) => (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Hora</TH>
                        <TH>Tipo</TH>
                        <TH>Motivo</TH>
                        <TH numeric>Importe</TH>
                      </TR>
                    </THead>
                    <tbody>
                      {rows.map((movement) => (
                        <TR key={movement.id}>
                          <TD>{dateTime(movement.createdAt)}</TD>
                          <TD>
                            {MOVEMENT_LABELS[movement.kind] ?? movement.kind}
                          </TD>
                          <TD>{movement.reason}</TD>
                          <TD numeric>{money(movement.amount)}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                )}
              </ClientPaged>
            )}
          </div>
        )}
      </QueryState>
    </Dialog>
  );
}
