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
import { money, reason } from '@/lib/schemas/common';
import { addMovement } from '../api';

const schema = z.object({
  direction: z.enum(['IN', 'OUT']),
  amount: money.refine((v) => /[1-9]/.test(v), 'Debe ser mayor que cero'),
  reason,
});
type Values = z.infer<typeof schema>;

export function MovementDialog({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const idem = useIdempotency();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'IN', amount: '', reason: '' },
  });
  const mutation = useApiMutation({
    mutationFn: (values: Values) =>
      addMovement(organizationId, sessionId!, values, idem.keyFor(values)),
    invalidate: [cashKeys.all(organizationId)],
    successMessage: 'Movimiento registrado',
    onSuccess: () => {
      idem.renew();
      form.reset();
      onClose();
    },
  });
  const errors = form.formState.errors;

  return (
    <FormDialog
      open={sessionId !== null}
      onClose={onClose}
      title="Movimiento de efectivo"
      description="Entrada o salida manual de efectivo. Requiere permiso de ajuste de caja."
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id="direction" label="Tipo">
        <Select id="direction" {...form.register('direction')}>
          <option value="IN">Entrada de efectivo</option>
          <option value="OUT">Salida de efectivo</option>
        </Select>
      </FormField>
      <FormField id="amount" label="Importe" error={errors.amount?.message}>
        <Input id="amount" inputMode="decimal" {...form.register('amount')} />
      </FormField>
      <FormField id="reason" label="Motivo" error={errors.reason?.message}>
        <Input id="reason" {...form.register('reason')} />
      </FormField>
    </FormDialog>
  );
}
