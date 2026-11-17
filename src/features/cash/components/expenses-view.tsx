'use client';

import { useState } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/data/pagination';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useBranches, useExpenseCategories } from '@/lib/queries/reference';
import { useExpenses } from '../hooks';
import { ExpenseDialog } from './expense-dialog';

const LIMIT = 20;

export function ExpensesView() {
  const { organizationId, money, dateTime } = useOrganization();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const expenses = useExpenses(organizationId, { page, limit: LIMIT });
  const categories = useExpenseCategories(organizationId);
  const branches = useBranches(organizationId);
  const categoryName = (id: string) =>
    categories.data?.find((c) => c.id === id)?.name ?? '—';
  const branchName = (id: string) =>
    branches.data?.find((b) => b.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title="Gastos"
        description="Gastos de la tienda; los pagados desde caja descuentan el efectivo esperado."
        actions={
          <Button onClick={() => setCreating(true)}>Registrar gasto</Button>
        }
      />
      <QueryState
        query={expenses}
        isEmpty={(d) => d.items.length === 0}
        empty={<EmptyBlock title="Sin gastos registrados" />}
      >
        {(data) => (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Descripción</TH>
                  <TH>Categoría</TH>
                  <TH>Sucursal</TH>
                  <TH>Origen</TH>
                  <TH numeric>Importe</TH>
                </TR>
              </THead>
              <tbody>
                {data.items.map((expense) => (
                  <TR key={expense.id}>
                    <TD>{dateTime(expense.occurredAt)}</TD>
                    <TD>{expense.description}</TD>
                    <TD>{categoryName(expense.categoryId)}</TD>
                    <TD>{branchName(expense.branchId)}</TD>
                    <TD>
                      {expense.cashSessionId ? (
                        <Badge tone="info">Caja</Badge>
                      ) : (
                        <Badge>Otro</Badge>
                      )}
                    </TD>
                    <TD numeric>{money(expense.amount)}</TD>
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
      <ExpenseDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
