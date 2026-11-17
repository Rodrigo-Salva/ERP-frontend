'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AreaChart } from '@/components/charts/area-chart';
import { ChartCard, ChartEmpty } from '@/components/charts/chart-card';
import { ColumnChart } from '@/components/charts/column-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import {
  seriesToColumns,
  shortLabel,
  sumSeries,
  type Series,
} from '@/components/charts/series';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { Tabs } from '@/components/ui/data/tabs';
import { MOVEMENT_KINDS } from '@/lib/movement-kinds';
import { addDays, addMonths, startOfMonth, todayIn } from '@/lib/dates';
import { formatQuantity } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useBranches, useExpenseCategories } from '@/lib/queries/reference';
import {
  exportUrl,
  fetchReport,
  reportKey,
  type CashRow,
  type ExpenseReport,
  type InventoryReport,
  type MovementRow,
  type PurchaseRow,
  type ReportFilters,
  type ReportType,
  type SalesReport,
} from '../api';

const LIMIT = 20;

/** Datos del reporte según el tipo, con los filtros comunes de fecha y sucursal. */
function useReport<T>(type: ReportType, filters: ReportFilters, page = 1) {
  const { organizationId } = useOrganization();
  const params = { ...filters, page, limit: LIMIT };
  return useQuery({
    queryKey: reportKey(organizationId, type, params),
    queryFn: ({ signal }) =>
      fetchReport<T>(organizationId, type, params, signal),
  });
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

function ExportLinks({
  type,
  filters,
}: {
  type: ReportType;
  filters: ReportFilters;
}) {
  const { organizationId } = useOrganization();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <a
        href={exportUrl(organizationId, type, filters, 'xlsx')}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <FileSpreadsheet aria-hidden className="size-4" /> Exportar Excel
      </a>
      <a
        href={exportUrl(organizationId, type, filters, 'csv')}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium hover:bg-muted"
      >
        <Download aria-hidden className="size-4" /> CSV
      </a>
    </div>
  );
}

function Section({
  type,
  filters,
  children,
}: {
  type: ReportType;
  filters: ReportFilters;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <ExportLinks type={type} filters={filters} />
      </div>
      {children}
    </div>
  );
}

/** Eje compacto: 1 250 → 1.3 mil. */
const compactNumber = (value: number) =>
  new Intl.NumberFormat('es', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

function CashDifferenceChart({ rows }: { rows: CashRow[] }) {
  const { money, dateTime } = useOrganization();
  const closed = rows
    .filter((row) => row.closedAt && row.difference !== null)
    .slice(0, 20)
    .reverse(); // cronológico: de la más antigua a la más reciente
  if (closed.length === 0) return null;
  const hasGap = closed.some((row) => Number(row.difference) !== 0);
  return (
    <ChartCard
      title="Diferencia en cada cierre"
      description={
        hasGap
          ? 'Positivo: sobró dinero. Negativo: faltó. Se grafican los cierres de esta página.'
          : 'Todos los cierres de esta página cuadraron.'
      }
    >
      <ColumnChart
        ariaLabel="Diferencia en cada cierre de caja"
        height={180}
        tone="sign"
        points={closed.map((row) => ({
          key: row.id,
          label: new Intl.DateTimeFormat('es', {
            day: 'numeric',
            month: 'short',
          })
            .format(new Date(row.closedAt!))
            .replace('.', ''),
          title: `Cierre del ${dateTime(row.closedAt!)}`,
          value: Number(row.difference),
        }))}
        format={(v) => `${v > 0 ? '+' : ''}${money(String(v))}`}
        formatAxis={compactNumber}
      />
    </ChartCard>
  );
}

function SalesTab({ filters }: { filters: ReportFilters }) {
  const { money, locale } = useOrganization();
  const query = useReport<SalesReport>('sales', filters);
  return (
    <Section type="sales" filters={filters}>
      <QueryState query={query}>
        {(r) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Ventas brutas"
                value={money(r.salesTotal)}
                hint={`${r.saleCount} ventas`}
              />
              <Stat label="Devoluciones" value={money(r.returnsTotal)} />
              <Stat
                label="Ventas netas"
                value={money(r.netTotal)}
                hint={`Sin impuestos ${money(r.netSalesExcludingTax)}`}
              />
              <Stat
                label="Ticket promedio"
                value={money(r.averageTicket)}
                hint={`Descuentos ${money(r.discount)} · impuestos netos ${money(r.netTax)}`}
              />
            </div>
            <ChartCard
              title="Ventas por día"
              description={
                r.daily?.granularity === 'month'
                  ? 'Total vendido por mes en el período.'
                  : 'Total vendido por día. Sin fechas elegidas, se muestran los últimos 30 días.'
              }
              aside={
                r.daily ? (
                  <>
                    <p className="text-lg font-semibold tabular-nums">
                      {money(String(sumSeries(r.daily)))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      en el gráfico
                    </p>
                  </>
                ) : null
              }
            >
              {r.daily && r.daily.points.length > 0 ? (
                <AreaChart
                  ariaLabel="Ventas por día"
                  points={seriesToColumns(r.daily)}
                  format={(v) => money(String(v))}
                  formatAxis={compactNumber}
                />
              ) : (
                <ChartEmpty>Sin datos para graficar.</ChartEmpty>
              )}
            </ChartCard>
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Cómo te pagan"
                description="Ventas por método de pago en el período."
              >
                {r.byMethod && r.byMethod.length > 0 ? (
                  <DonutChart
                    ariaLabel="Ventas por método de pago"
                    centerLabel="Cobrado"
                    items={r.byMethod.map((m) => ({
                      label: m.method,
                      value: m.total,
                    }))}
                    format={(v) => money(String(v))}
                  />
                ) : (
                  <ChartEmpty>Sin cobros en el período.</ChartEmpty>
                )}
              </ChartCard>
              <ChartCard
                title="Productos más vendidos"
                description="Por total vendido en el período."
              >
                {r.topProducts.length === 0 ? (
                  <ChartEmpty>Sin ventas en el período.</ChartEmpty>
                ) : (
                  <ColumnChart
                    ariaLabel="Productos más vendidos por total"
                    height={200}
                    valueLabels
                    points={[...r.topProducts]
                      .sort(
                        (a, b) => Number(b.total ?? 0) - Number(a.total ?? 0),
                      )
                      .slice(0, 5)
                      .map((p) => ({
                        key: p.variantId,
                        label: shortLabel(p.name),
                        title: `${p.name} (${p.sku})`,
                        value: Number(p.total ?? 0),
                      }))}
                    format={(v) => money(String(v))}
                    formatAxis={compactNumber}
                  />
                )}
              </ChartCard>
            </div>
            <h2 className="text-base font-semibold">
              Detalle de productos vendidos
            </h2>
            {r.topProducts.length === 0 ? (
              <EmptyBlock title="Sin ventas en el período" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Artículo</TH>
                    <TH numeric>Cantidad</TH>
                    <TH numeric>Total</TH>
                  </TR>
                </THead>
                <tbody>
                  {r.topProducts.map((p) => (
                    <TR key={p.variantId}>
                      <TD>
                        {p.name}{' '}
                        <span className="text-xs text-muted-foreground">
                          {p.sku}
                        </span>
                      </TD>
                      <TD numeric>
                        {p.grossQuantity
                          ? formatQuantity(p.grossQuantity, locale)
                          : '—'}
                      </TD>
                      <TD numeric>{p.total ? money(p.total) : '—'}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </QueryState>
    </Section>
  );
}

function InventoryTab({ filters }: { filters: ReportFilters }) {
  const { money, locale } = useOrganization();
  const [page, setPage] = useState(1);
  const query = useReport<InventoryReport>('inventory', filters, page);
  return (
    <Section type="inventory" filters={filters}>
      <QueryState
        query={query}
        isEmpty={(r) => r.items.length === 0}
        empty={<EmptyBlock title="Sin existencias" />}
      >
        {(r) => (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Stat
                label="Valoración del inventario (promedio ponderado)"
                value={money(r.valuation)}
              />
              <ChartCard
                title="Dónde está el dinero del inventario"
                description="Los artículos con más valor en existencias."
              >
                {r.topByValue && r.topByValue.length > 0 ? (
                  <DonutChart
                    ariaLabel="Artículos con más valor en inventario"
                    centerLabel="En artículos top"
                    items={r.topByValue.map((i) => ({
                      label: i.name,
                      hint: i.sku,
                      value: i.value,
                    }))}
                    format={(v) => money(String(v))}
                  />
                ) : (
                  <ChartEmpty>Sin valor en existencias.</ChartEmpty>
                )}
              </ChartCard>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Artículo</TH>
                  <TH>Almacén</TH>
                  <TH numeric>Existencias</TH>
                  <TH numeric>Valor</TH>
                </TR>
              </THead>
              <tbody>
                {r.items.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      {i.name}{' '}
                      <span className="text-xs text-muted-foreground">
                        {i.sku}
                      </span>
                    </TD>
                    <TD>{i.warehouseName}</TD>
                    <TD numeric>{formatQuantity(i.quantity, locale)}</TD>
                    <TD numeric>{money(i.value)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={r.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
    </Section>
  );
}

function MovementsTab({ filters }: { filters: ReportFilters }) {
  const { money, locale, dateTime, canSeeCosts } = useOrganization();
  const [page, setPage] = useState(1);
  const query = useReport<{
    items: MovementRow[];
    byKind?: Array<{ kind: string; count: number }>;
  }>('movements', filters, page);
  return (
    <Section type="movements" filters={filters}>
      <QueryState
        query={query}
        isEmpty={(r) => r.items.length === 0}
        empty={<EmptyBlock title="Sin movimientos en el período" />}
      >
        {(r) => (
          <>
            <ChartCard
              title="Movimientos por tipo"
              description="Cantidad de movimientos de inventario en el período."
            >
              {r.byKind && r.byKind.length > 0 ? (
                <DonutChart
                  ariaLabel="Movimientos por tipo"
                  centerLabel="Movimientos"
                  items={r.byKind.map((k) => ({
                    label: MOVEMENT_KINDS[k.kind] ?? k.kind,
                    value: k.count,
                  }))}
                  format={(v) => String(v)}
                />
              ) : (
                <ChartEmpty>Sin datos para graficar.</ChartEmpty>
              )}
            </ChartCard>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Tipo</TH>
                  <TH>Artículo</TH>
                  <TH>Almacén</TH>
                  <TH numeric>Cambio</TH>
                  {canSeeCosts ? <TH numeric>Costo unit.</TH> : null}
                </TR>
              </THead>
              <tbody>
                {r.items.map((m) => (
                  <TR key={m.id}>
                    <TD>{dateTime(m.createdAt)}</TD>
                    <TD>
                      {MOVEMENT_KINDS[m.kind] ?? m.kind}
                      <span className="block text-xs text-muted-foreground">
                        {m.reason}
                      </span>
                    </TD>
                    <TD>
                      {m.name}{' '}
                      <span className="text-xs text-muted-foreground">
                        {m.sku}
                      </span>
                    </TD>
                    <TD>{m.warehouseName}</TD>
                    <TD numeric>{formatQuantity(m.delta, locale)}</TD>
                    {canSeeCosts ? (
                      <TD numeric>{m.unitCost ? money(m.unitCost) : '—'}</TD>
                    ) : null}
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={r.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
    </Section>
  );
}

function CashTab({ filters }: { filters: ReportFilters }) {
  const { money, dateTime } = useOrganization();
  const [page, setPage] = useState(1);
  const query = useReport<{ items: CashRow[] }>('cash', filters, page);
  return (
    <Section type="cash" filters={filters}>
      <QueryState
        query={query}
        isEmpty={(r) => r.items.length === 0}
        empty={<EmptyBlock title="Sin cierres de caja en el período" />}
      >
        {(r) => (
          <>
            <CashDifferenceChart rows={r.items} />
            <Table>
              <THead>
                <TR>
                  <TH>Apertura</TH>
                  <TH>Estado</TH>
                  <TH numeric>Fondo</TH>
                  <TH numeric>Esperado</TH>
                  <TH numeric>Contado</TH>
                  <TH numeric>Diferencia</TH>
                </TR>
              </THead>
              <tbody>
                {r.items.map((c) => (
                  <TR key={c.id}>
                    <TD>{dateTime(c.createdAt)}</TD>
                    <TD>
                      {c.closedAt ? (
                        <Badge>Cerrada</Badge>
                      ) : (
                        <Badge tone="success">Abierta</Badge>
                      )}
                    </TD>
                    <TD numeric>{money(c.opening)}</TD>
                    <TD numeric>{c.expected ? money(c.expected) : '—'}</TD>
                    <TD numeric>{c.counted ? money(c.counted) : '—'}</TD>
                    <TD numeric>{c.difference ? money(c.difference) : '—'}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={r.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
    </Section>
  );
}

function PurchasesTab({ filters }: { filters: ReportFilters }) {
  const { money, dateTime } = useOrganization();
  const [page, setPage] = useState(1);
  const query = useReport<{
    items: PurchaseRow[];
    daily?: Series;
  }>('purchases', filters, page);
  return (
    <Section type="purchases" filters={filters}>
      <QueryState
        query={query}
        isEmpty={(r) => r.items.length === 0}
        empty={<EmptyBlock title="Sin recepciones en el período" />}
      >
        {(r) => (
          <>
            <ChartCard
              title="Mercadería recibida por día"
              description="Valor de lo recibido. Sin fechas elegidas, se muestran los últimos 30 días."
              aside={
                r.daily ? (
                  <p className="text-lg font-semibold tabular-nums">
                    {money(String(sumSeries(r.daily)))}
                  </p>
                ) : null
              }
            >
              {r.daily && r.daily.points.length > 0 ? (
                <AreaChart
                  ariaLabel="Mercadería recibida por día"
                  points={seriesToColumns(r.daily)}
                  format={(v) => money(String(v))}
                  formatAxis={compactNumber}
                />
              ) : (
                <ChartEmpty>Sin datos para graficar.</ChartEmpty>
              )}
            </ChartCard>
            <Table>
              <THead>
                <TR>
                  <TH>Recepción</TH>
                  <TH numeric>Líneas</TH>
                  <TH numeric>Total</TH>
                </TR>
              </THead>
              <tbody>
                {r.items.map((p) => (
                  <TR key={p.id}>
                    <TD>{dateTime(p.createdAt)}</TD>
                    <TD numeric>{p.lines.length}</TD>
                    <TD numeric>{money(p.total)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={r.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
    </Section>
  );
}

function ExpensesTab({ filters }: { filters: ReportFilters }) {
  const { organizationId, money, dateTime } = useOrganization();
  const categories = useExpenseCategories(organizationId);
  const [page, setPage] = useState(1);
  const query = useReport<ExpenseReport>('expenses', filters, page);
  return (
    <Section type="expenses" filters={filters}>
      <QueryState
        query={query}
        isEmpty={(r) => r.items.length === 0}
        empty={<EmptyBlock title="Sin gastos en el período" />}
      >
        {(r) => (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <Stat label="Total de gastos" value={money(r.total)} />
              <ChartCard
                title="Gastos por categoría"
                description="Dónde se va el dinero en el período."
              >
                {r.byCategory && r.byCategory.length > 0 ? (
                  <DonutChart
                    ariaLabel="Gastos por categoría"
                    centerLabel="Total"
                    items={r.byCategory.map((c) => ({
                      label: c.category,
                      value: c.total,
                    }))}
                    format={(v) => money(String(v))}
                  />
                ) : (
                  <ChartEmpty>Sin datos para graficar.</ChartEmpty>
                )}
              </ChartCard>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Descripción</TH>
                  <TH>Categoría</TH>
                  <TH numeric>Importe</TH>
                </TR>
              </THead>
              <tbody>
                {r.items.map((e) => (
                  <TR key={e.id}>
                    <TD>{dateTime(e.occurredAt)}</TD>
                    <TD>{e.description}</TD>
                    <TD>
                      {categories.data?.find((c) => c.id === e.categoryId)
                        ?.name ?? '—'}
                    </TD>
                    <TD numeric>{money(e.amount)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              count={r.items.length}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>
    </Section>
  );
}

export function ReportsView() {
  const { organizationId, isManager, timeZone } = useOrganization();
  const branches = useBranches(organizationId);
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Se envían días completos: el backend los resuelve en la zona de la tienda o
  // sucursal, no en la del navegador.
  const filters: ReportFilters = {
    branchId: branchId || undefined,
    fromDay: from || undefined,
    toDay: to || undefined,
  };
  const zone =
    branches.data?.find((b) => b.id === branchId)?.timeZone ?? timeZone;
  const today = todayIn(zone);
  const presets = [
    { label: 'Hoy', from: today, to: today },
    { label: 'Ayer', from: addDays(today, -1), to: addDays(today, -1) },
    { label: 'Últimos 7 días', from: addDays(today, -6), to: today },
    { label: 'Este mes', from: startOfMonth(today), to: today },
    {
      label: 'Mes anterior',
      from: startOfMonth(addMonths(today, -1)),
      to: addDays(startOfMonth(today), -1),
    },
  ];

  // Con filtros nuevos cada pestaña paginada se vuelve a montar y vuelve a la página 1.
  const filterKey = JSON.stringify(filters);
  const tabs = [
    { key: 'sales', label: 'Ventas', content: <SalesTab filters={filters} /> },
    {
      key: 'cash',
      label: 'Caja',
      content: <CashTab key={filterKey} filters={filters} />,
    },
    ...(isManager
      ? [
          {
            key: 'inventory',
            label: 'Valoración',
            content: <InventoryTab key={filterKey} filters={filters} />,
          },
          {
            key: 'movements',
            label: 'Movimientos',
            content: <MovementsTab key={filterKey} filters={filters} />,
          },
          {
            key: 'purchases',
            label: 'Compras',
            content: <PurchasesTab key={filterKey} filters={filters} />,
          },
          {
            key: 'expenses',
            label: 'Gastos',
            content: <ExpensesTab key={filterKey} filters={filters} />,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Filtra por sucursal y fechas. Los CSV respetan los mismos permisos."
      />
      <section
        aria-label="Filtros"
        className="mb-5 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            Sucursal
            <Select
              aria-label="Sucursal"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Desde</span>
            <DatePicker
              aria-label="Desde"
              value={from}
              onChange={setFrom}
              today={today}
              max={to || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Hasta</span>
            <DatePicker
              aria-label="Hasta"
              value={to}
              onChange={setTo}
              today={today}
              min={from || undefined}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => {
            const active = from === preset.from && to === preset.to;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFrom(preset.from);
                  setTo(preset.to);
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {preset.label}
              </button>
            );
          })}
          {from || to ? (
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Limpiar fechas
            </button>
          ) : null}
          <span className="ml-auto text-xs text-muted-foreground">
            Los días se cuentan en la zona{' '}
            {branchId ? 'de la sucursal' : 'de la tienda'}: {zone}
          </span>
        </div>
      </section>
      <Tabs tabs={tabs} />
    </>
  );
}
