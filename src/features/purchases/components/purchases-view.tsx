'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/data/tabs';
import { OrdersPanel } from './orders-panel';
import { SuppliersPanel } from './suppliers-panel';

export function PurchasesView() {
  return (
    <>
      <PageHeader
        title="Compras"
        description="Proveedores, órdenes de compra y recepción de mercadería."
      />
      <Tabs
        tabs={[
          {
            key: 'orders',
            label: 'Órdenes de compra',
            content: <OrdersPanel />,
          },
          {
            key: 'suppliers',
            label: 'Proveedores',
            content: <SuppliersPanel />,
          },
        ]}
      />
    </>
  );
}
