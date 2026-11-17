'use client';

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart } from '@/components/charts/area-chart';
import { ChartCard, ChartEmpty } from '@/components/charts/chart-card';
import { ColumnChart } from '@/components/charts/column-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import {
  seriesToColumns,
  shortLabel,
  sumSeries,
} from '@/components/charts/series';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyBlock } from '@/components/ui/data/query-state';
import { formatMoney } from '@/lib/money';
import { isModuleEnabled } from '@/config/modules';
import { cn } from '@/lib/utils';
import { useDashboard } from '../hooks';

interface DashboardViewProps {
  organizationId: string;
  currency: string;
  locale: string;
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        'relative min-w-0 overflow-hidden',
        accent && 'border-primary/25',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            accent
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon aria-hidden className="size-[18px]" />
        </span>
      </div>
      <p className="mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {hint}
      </p>
    </Card>
  );
}

/** Eje compacto: 1 250 → 1.3 mil. */
const compactNumber = (value: number) =>
  new Intl.NumberFormat('es', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function DashboardView({
  organizationId,
  currency,
  locale,
}: DashboardViewProps) {
  const { name, canSell, isManager } = useOrganization();
  const { data, error, isPending, isFetching, refetch } =
    useDashboard(organizationId);
  const href = (path: string) => `/${organizationId}/${path}`;
  const hasPos = canSell && isModuleEnabled('pos');
  const hasCash = canSell && isModuleEnabled('cash');
  const hasInventory = isModuleEnabled('inventory');
  const hasReports = isModuleEnabled('reports');
  const money = (value: string) => formatMoney(value, currency, locale);
  const linkStyle =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors';

  return (
    <div className="space-y-6" aria-busy={isFetching}>
      <PageHeader
        title="Panel"
        description={`Así va tu día en ${name}.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                aria-hidden
                className={cn('size-4', isFetching && 'animate-spin')}
              />
              Actualizar
            </Button>
            {hasPos ? (
              <Link
                className={cn(
                  linkStyle,
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
                href={href('sales')}
              >
                <Plus aria-hidden className="size-4" />
                Nueva venta
              </Link>
            ) : null}
          </>
        }
      />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/5 px-6 py-5">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Resumen de hoy
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
            Tu negocio, de un vistazo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas, caja e inventario para organizar tu jornada.
          </p>
        </div>
        {data ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium">
            <CalendarDays aria-hidden className="size-4 text-primary" />
            <time dateTime={data.period.from}>
              {new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: data.timeZone,
              }).format(new Date(data.period.from))}
            </time>
          </div>
        ) : null}
      </section>
      {isPending ? (
        <div
          role="status"
          aria-label="Cargando panel"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted" />
          ))}
        </div>
      ) : error ? (
        <Card role="alert" className="space-y-3">
          <p className="font-medium">No se pudo cargar el panel</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
            <Stat
              icon={Banknote}
              label="Ventas netas del día"
              value={money(data.sales.netTotal)}
              hint={`Brutas ${money(data.sales.salesTotal)} · devoluciones ${money(data.sales.returnsTotal)}`}
              accent
            />
            <Stat
              icon={ShoppingCart}
              label="Número de ventas"
              value={String(data.sales.saleCount)}
              hint={`Ticket promedio ${money(data.sales.averageTicket)}`}
            />
            {hasCash ? (
              <Stat
                icon={Receipt}
                label="Cajas abiertas"
                value={String(data.openCashSessions)}
                hint="Sesiones de caja en operación"
              />
            ) : null}
            {hasInventory ? (
              <Stat
                icon={AlertTriangle}
                label="Alertas de stock"
                value={String(data.lowStockAlerts)}
                hint="Artículos en o bajo su umbral por almacén"
              />
            ) : null}
          </div>
          {data.trend ? (
            <ChartCard
              title="Ventas de los últimos 7 días"
              description="Total vendido por día, hoy incluido."
              aside={
                <>
                  <p className="text-lg font-semibold tabular-nums">
                    {money(String(sumSeries(data.trend)))}
                  </p>
                  <p className="text-xs text-muted-foreground">en la semana</p>
                </>
              }
            >
              {sumSeries(data.trend) > 0 ? (
                <AreaChart
                  ariaLabel="Ventas de los últimos 7 días"
                  height={220}
                  points={seriesToColumns(data.trend)}
                  format={(v) => money(String(v))}
                  formatAxis={compactNumber}
                />
              ) : (
                <ChartEmpty>
                  Cuando registres ventas verás aquí cómo evoluciona tu semana.
                </ChartEmpty>
              )}
            </ChartCard>
          ) : null}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Más vendidos hoy</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Los productos que mueven tu negocio.
                  </p>
                </div>
                <Badge>Hoy</Badge>
              </div>
              {data.sales.topProducts.length === 0 ? (
                <EmptyBlock
                  title="Tu próxima venta empieza aquí"
                  description="Aún no hay ventas confirmadas hoy. Aquí verás tus productos más vendidos."
                  action={
                    hasPos ? (
                      <Link
                        className={cn(
                          linkStyle,
                          'bg-primary text-primary-foreground',
                        )}
                        href={href('sales')}
                      >
                        Ir al punto de venta
                        <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ColumnChart
                  ariaLabel="Productos más vendidos hoy"
                  height={210}
                  valueLabels
                  points={data.sales.topProducts.slice(0, 6).map((product) => ({
                    key: product.variantId,
                    label: shortLabel(product.name),
                    title: `${product.name} (${product.sku})`,
                    value: Number(product.total ?? 0),
                  }))}
                  format={(v) => money(String(v))}
                  formatAxis={compactNumber}
                />
              )}
              {hasReports ? (
                <Link
                  href={href('reports')}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  Ver reportes del negocio
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              ) : null}
            </section>
            <div className="space-y-5">
              {data.sales.byMethod && data.sales.byMethod.length > 0 ? (
                <ChartCard
                  title="Cómo te pagaron hoy"
                  description="Cobros por método de pago."
                >
                  <DonutChart
                    ariaLabel="Cobros de hoy por método de pago"
                    centerLabel="Cobrado hoy"
                    className="sm:flex-col sm:items-stretch"
                    items={data.sales.byMethod.map((m) => ({
                      label: m.method,
                      value: m.total,
                    }))}
                    format={(v) => money(String(v))}
                  />
                </ChartCard>
              ) : null}
              {hasInventory ? (
                <Card>
                  <h2 className="mb-4 font-semibold">Para tener en cuenta</h2>
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                      {data.lowStockAlerts > 0 ? (
                        <AlertTriangle aria-hidden className="size-5" />
                      ) : (
                        <CheckCircle2 aria-hidden className="size-5" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {data.lowStockAlerts > 0
                          ? 'Hay productos por reponer'
                          : 'Sin alertas de stock'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {data.lowStockAlerts > 0
                          ? `${data.lowStockAlerts} alertas de existencias en tus almacenes. Revisa qué necesitas reponer.`
                          : 'No se registran artículos por debajo o en el umbral configurado.'}
                      </p>
                      <Link
                        href={href('inventory')}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Revisar inventario
                        <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>
              ) : null}
              <Card>
                <h2 className="mb-4 font-semibold">Accesos rápidos</h2>
                <div className="space-y-2">
                  {[
                    ...(hasCash
                      ? [
                          {
                            path: 'cash',
                            icon: Receipt,
                            title: 'Gestionar caja',
                            description: 'Aperturas, movimientos y cierres',
                          },
                        ]
                      : []),
                    {
                      path: 'products',
                      icon: Package,
                      title: 'Ver productos',
                      description: 'Tu catálogo y precios',
                    },
                    ...(isManager && isModuleEnabled('purchases')
                      ? [
                          {
                            path: 'purchases',
                            icon: ShoppingCart,
                            title: 'Registrar compras',
                            description: 'Proveedores y mercadería',
                          },
                        ]
                      : []),
                  ].map(({ path, icon: Icon, title, description }) => (
                    <Link
                      key={path}
                      href={href(path)}
                      className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
                    >
                      <Icon
                        aria-hidden
                        className="size-5 shrink-0 text-muted-foreground group-hover:text-primary"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium">
                          {title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {description}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 text-muted-foreground"
                      />
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
