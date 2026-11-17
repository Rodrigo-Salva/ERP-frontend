'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/forms/select';
import { Tabs } from '@/components/ui/data/tabs';
import { useBranches } from '@/lib/queries/reference';
import { AdjustDialog } from './adjust-dialog';
import { BalancesPanel, LowStockPanel, MovementsPanel } from './stock-panels';
import { TransfersPanel } from './transfers-panel';

export function InventoryView() {
  const { organizationId, isManager, can } = useOrganization();
  const branches = useBranches(organizationId);
  const [branchId, setBranchId] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const filter = branchId || undefined;

  const tabs = [
    {
      key: 'balances',
      label: 'Existencias',
      content: <BalancesPanel key={branchId} branchId={filter} />,
    },
    {
      key: 'movements',
      label: 'Movimientos',
      content: <MovementsPanel key={branchId} branchId={filter} />,
    },
    { key: 'low', label: 'Stock bajo', content: <LowStockPanel /> },
    ...(isManager
      ? [
          {
            key: 'transfers',
            label: 'Transferencias',
            content: <TransfersPanel />,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias por almacén, historial de movimientos y alertas."
        actions={
          isManager && can('inventory.adjust') ? (
            <Button onClick={() => setAdjusting(true)}>
              Ajustar inventario
            </Button>
          ) : null
        }
      />
      {(branches.data?.length ?? 0) > 1 ? (
        <div className="mb-4 max-w-xs">
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
        </div>
      ) : null}
      <Tabs tabs={tabs} />
      <AdjustDialog open={adjusting} onClose={() => setAdjusting(false)} />
    </>
  );
}
