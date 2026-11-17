'use client';

import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { NavItem } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { Logo } from '@/components/shared/logo';
import { NavLink } from './nav-link';
import { ThemeToggle } from './theme-toggle';

interface AppShellProps {
  organizationId: string;
  organizationName: string;
  userName: string;
  navigation: NavItem[];
  userMenu: ReactNode;
  children: ReactNode;
}

const groups = [
  {
    label: 'Mi negocio',
    keys: ['dashboard', 'pos', 'sales', 'cash', 'expenses'],
  },
  {
    label: 'Gestión',
    keys: ['products', 'categories', 'inventory', 'purchases', 'customers'],
  },
  { label: 'Administración', keys: ['reports', 'audit', 'settings'] },
];

export function AppShell({
  organizationId,
  organizationName,
  userName,
  navigation,
  userMenu,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const current = navigation.find((item) => {
    const href = `/${organizationId}/${item.segment}`;
    return (
      pathname === href || (!item.exact && pathname.startsWith(`${href}/`))
    );
  });
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  const nav = (mobile = false) => (
    <nav
      aria-label={mobile ? 'Principal móvil' : 'Principal'}
      className="space-y-6 px-3 py-5"
    >
      {groups.map((group) => {
        const items = navigation.filter((item) =>
          group.keys.includes(item.key),
        );
        return items.length ? (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.key}
                  itemKey={item.key}
                  href={`/${organizationId}/${item.segment}`}
                  label={item.label}
                  available={item.available}
                  exact={item.exact}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </div>
          </div>
        ) : null;
      })}
    </nav>
  );

  const account = (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-hover p-2.5">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff6a5c] to-[#c41f35] text-sm font-bold text-white shadow-sm"
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold" title={userName}>
          {userName}
        </span>
        <span
          className="mt-0.5 block truncate text-xs text-sidebar-muted"
          title={organizationName}
        >
          {organizationName}
        </span>
      </span>
      {userMenu}
    </div>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link
          href={`/${organizationId}/dashboard`}
          className="flex min-h-20 items-center border-b border-sidebar-border px-6"
        >
          <Logo tagline />
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto">{nav()}</div>
        {account}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              aria-label="Abrir navegación"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden className="size-5" />
            </Button>
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:block">
              {organizationName}
            </span>
            <ChevronRight
              aria-hidden
              className="hidden size-3.5 text-muted-foreground lg:block"
            />
            <span className="truncate text-sm font-medium">
              {current?.label ?? 'Mi negocio'}
            </span>
          </div>
          <ThemeToggle compact />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 outline-none sm:p-7 lg:p-9"
        >
          {children}
        </main>
        <footer className="flex flex-wrap justify-between gap-2 px-4 pb-5 text-[11px] text-muted-foreground sm:px-7 lg:px-9">
          <span>Tendio · Gestión de tu negocio</span>
          <span>Inventario, ventas y caja en un solo lugar</span>
        </footer>
      </div>
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Tendio"
        className="max-w-sm border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <p className="truncate text-sm text-sidebar-muted">
          {organizationName}
        </p>
        {nav(true)}
        <div className="-mx-3 mt-4">{account}</div>
      </Dialog>
    </div>
  );
}
