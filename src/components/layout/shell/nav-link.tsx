'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ArrowDownToLine,
  ChartNoAxesCombined,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  sales: ReceiptText,
  cash: Wallet,
  expenses: ArrowDownToLine,
  products: Package,
  categories: FolderTree,
  inventory: ClipboardList,
  purchases: ShoppingBag,
  customers: Users,
  reports: ChartNoAxesCombined,
  audit: ShieldCheck,
  settings: Settings2,
};

export function NavLink({
  href,
  label,
  available,
  exact = false,
  itemKey,
  onNavigate,
}: {
  href: string;
  label: string;
  available: boolean;
  exact?: boolean;
  itemKey?: string;
  onNavigate?: () => void;
}) {
  const Icon = icons[itemKey ?? ''] ?? Package;
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  if (!available) {
    return (
      <span
        aria-disabled="true"
        title="Disponible próximamente"
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-muted opacity-60"
      >
        <Icon aria-hidden className="size-[18px] shrink-0" />
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-sidebar-active text-sidebar-foreground ring-1 ring-inset ring-sidebar-border'
          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
      )}
    >
      <Icon
        aria-hidden
        className={cn('size-[18px] shrink-0', active && 'text-sidebar-accent')}
      />
      <span className="flex-1">{label}</span>
      {active ? (
        <span aria-hidden className="size-1.5 rounded-full bg-sidebar-accent" />
      ) : null}
    </Link>
  );
}
