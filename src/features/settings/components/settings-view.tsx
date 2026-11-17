'use client';

import { ThemeToggle } from '@/components/layout/shell/theme-toggle';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/data/tabs';
import { OrganizationForm } from './organization-form';
import {
  BranchesPanel,
  ExpenseCategoriesPanel,
  PaymentMethodsPanel,
  WarehousesPanel,
} from './structure-panels';
import { TeamPanel } from './team-panel';

export function SettingsView() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Tienda, sucursales, pagos, impuestos y equipo."
      />
      <Tabs
        tabs={[
          {
            key: 'organization',
            label: 'Tienda',
            content: <OrganizationForm />,
          },
          { key: 'branches', label: 'Sucursales', content: <BranchesPanel /> },
          {
            key: 'warehouses',
            label: 'Almacenes',
            content: <WarehousesPanel />,
          },
          {
            key: 'payments',
            label: 'Métodos de pago',
            content: <PaymentMethodsPanel />,
          },
          {
            key: 'expenses',
            label: 'Categorías de gasto',
            content: <ExpenseCategoriesPanel />,
          },
          { key: 'team', label: 'Equipo', content: <TeamPanel /> },
          {
            key: 'appearance',
            label: 'Apariencia',
            content: (
              <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold">Tema de la aplicación</h2>
                <p className="text-sm text-muted-foreground">
                  Elige el tono claro u oscuro. Se recuerda en este navegador.
                </p>
                <ThemeToggle />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
