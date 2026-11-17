'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { Select } from '@/components/ui/forms/select';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { cashKeys } from '@/lib/queries/cash';
import { useBranches, useCashRegisters } from '@/lib/queries/reference';
import { money } from '@/lib/schemas/common';
import { openSession } from '../api';

const schema = z.object({
  cashRegisterId: z.string().min(1, 'Elige un punto de caja'),
  opening: money,
});
type Values = z.infer<typeof schema>;

export function OpenSessionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const registers = useCashRegisters(organizationId);
  const branches = useBranches(organizationId);
  const idem = useIdempotency();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { cashRegisterId: '', opening: '0.00' },
  });
  const branchName = (id: string) =>
    branches.data?.find((b) => b.id === id)?.name;

  const mutation = useApiMutation({
    mutationFn: (values: Values) =>
      openSession(organizationId, values, idem.keyFor(values)),
    invalidate: [cashKeys.all(organizationId)],
    successMessage: 'Caja abierta',
    onSuccess: () => {
      idem.renew();
      form.reset();
      onClose();
    },
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Abrir caja"
      description="Indica el punto de caja y el efectivo con el que empiezas."
      submitLabel="Abrir caja"
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField
        id="cashRegisterId"
        label="Punto de caja"
        error={form.formState.errors.cashRegisterId?.message}
      >
        <Select id="cashRegisterId" {...form.register('cashRegisterId')}>
          <option value="">Selecciona…</option>
          {registers.data?.map((register) => (
            <option key={register.id} value={register.id}>
              {register.name}
              {branchName(register.branchId)
                ? ` — ${branchName(register.branchId)}`
                : ''}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="opening"
        label="Fondo inicial"
        error={form.formState.errors.opening?.message}
      >
        <Input id="opening" inputMode="decimal" {...form.register('opening')} />
      </FormField>
    </FormDialog>
  );
}
