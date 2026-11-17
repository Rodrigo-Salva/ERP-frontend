'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { cashKeys, useOpenCashSessions } from '@/lib/queries/cash';
import { useBranches, useExpenseCategories } from '@/lib/queries/reference';
import { money, reason } from '@/lib/schemas/common';
import { createExpense } from '../api';

const schema = z.object({
  branchId: z.string().min(1, 'Elige una sucursal'),
  categoryId: z.string().min(1, 'Elige una categoría'),
  cashSessionId: z.string(),
  amount: money.refine((v) => /[1-9]/.test(v), 'Debe ser mayor que cero'),
  description: reason,
  occurredAt: z.string().min(1, 'Indica la fecha'),
});
type Values = z.infer<typeof schema>;

/** `datetime-local` entrega hora local sin zona; se convierte a ISO UTC para el servidor. */
const nowLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export function ExpenseDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const branches = useBranches(organizationId);
  const categories = useExpenseCategories(organizationId);
  const sessions = useOpenCashSessions(organizationId);
  const idem = useIdempotency();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: '',
      categoryId: '',
      cashSessionId: '',
      amount: '',
      description: '',
      occurredAt: nowLocal(),
    },
  });
  const branchId = useWatch({ control: form.control, name: 'branchId' });
  const branchSessions =
    sessions.data?.filter((s) => s.branchId === branchId) ?? [];
  const errors = form.formState.errors;

  const mutation = useApiMutation({
    mutationFn: (values: Values) => {
      const body = {
        branchId: values.branchId,
        categoryId: values.categoryId,
        cashSessionId: values.cashSessionId || undefined,
        amount: values.amount,
        description: values.description,
        occurredAt: new Date(values.occurredAt).toISOString(),
      };
      return createExpense(organizationId, body, idem.keyFor(body));
    },
    invalidate: [
      ['organizations', organizationId, 'expenses'],
      cashKeys.all(organizationId),
    ],
    successMessage: 'Gasto registrado',
    onSuccess: () => {
      idem.renew();
      form.reset({
        ...form.formState.defaultValues,
        occurredAt: nowLocal(),
      } as Values);
      onClose();
    },
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Registrar gasto"
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField
        id="branchId"
        label="Sucursal"
        error={errors.branchId?.message}
      >
        <Select id="branchId" {...form.register('branchId')}>
          <option value="">Selecciona…</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="categoryId"
        label="Categoría"
        error={errors.categoryId?.message}
      >
        <Select id="categoryId" {...form.register('categoryId')}>
          <option value="">Selecciona…</option>
          {categories.data
            ?.filter((c) => !c.archivedAt)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </FormField>
      <FormField id="cashSessionId" label="Pagado desde caja (opcional)">
        <Select id="cashSessionId" {...form.register('cashSessionId')}>
          <option value="">No sale de caja</option>
          {branchSessions.map((s) => (
            <option key={s.id} value={s.id}>
              Caja abierta el {new Date(s.createdAt).toLocaleString()}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="amount" label="Importe" error={errors.amount?.message}>
        <Input id="amount" inputMode="decimal" {...form.register('amount')} />
      </FormField>
      <FormField
        id="description"
        label="Descripción"
        error={errors.description?.message}
      >
        <Input id="description" {...form.register('description')} />
      </FormField>
      <FormField
        id="occurredAt"
        label="Fecha y hora"
        error={errors.occurredAt?.message}
      >
        <Input
          id="occurredAt"
          type="datetime-local"
          {...form.register('occurredAt')}
        />
      </FormField>
    </FormDialog>
  );
}
