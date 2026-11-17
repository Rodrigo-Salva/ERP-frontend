import { ArrowUpRight, Boxes, ChartNoAxesCombined, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shared/logo';

/** Marco compartido por acceso, registro y recuperación de cuenta. */
export function AuthCard({
  title,
  description,
  wide,
  children,
  footer,
}: {
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-dvh lg:h-dvh lg:grid lg:overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
      <section
        className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-hero p-10 text-sidebar-foreground lg:flex xl:p-14"
        aria-label="Tendio"
      >
        <Logo />
        <div className="relative z-10 my-6 max-w-lg">
          <p className="mb-5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Menos tareas. Más negocio.
          </p>
          <h2 className="text-4xl leading-[1.15] font-semibold tracking-tight xl:text-5xl">
            Todo lo que pasa en tu tienda.
            <br />
            <span className="text-primary">En un solo lugar.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-sidebar-muted">
            Desde la primera venta hasta el cierre de caja. Lleva el control de
            tu día con claridad.
          </p>
          <div className="mt-10 space-y-3">
            {[
              {
                icon: Boxes,
                title: 'Inventario al día',
                text: 'Productos, existencias y compras.',
              },
              {
                icon: Wallet,
                title: 'Cada venta cuenta',
                text: 'Ventas y movimientos de caja conectados.',
              },
              {
                icon: ChartNoAxesCombined,
                title: 'Decide con información',
                text: 'Reportes para entender tu negocio.',
              },
            ].map(({ icon: Icon, title: label, text }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-xl border border-sidebar-border bg-hero-card p-4"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-0.5 text-xs text-sidebar-muted">{text}</p>
                </div>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 text-sidebar-muted"
                />
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sidebar-muted">
          Hecho para el día a día de tu tienda.
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-48 -bottom-64 size-[600px] rounded-full border-[80px] border-primary/[0.06]"
        />
      </section>
      <section className="flex min-h-full flex-col lg:overflow-y-auto items-center justify-center bg-card px-6 py-12 sm:px-12">
        <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
          <div className="mb-10 text-foreground lg:hidden">
            <Logo />
          </div>
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
              Tu espacio de trabajo
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? (
            <div className="mt-7 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
