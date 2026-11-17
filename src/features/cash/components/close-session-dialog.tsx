'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { subtractDecimal } from '@/lib/decimal';
import { useIdempotency } from '@/lib/hooks/use-idempotency';
import { cashKeys, type CashSession } from '@/lib/queries/cash';
import { money } from '@/lib/schemas/common';
import { closeSession } from '../api';

const schema = z.object({ counted: money });
type Values = z.infer<typeof schema>;

export function CloseSessionDialog({
  session,
  expected,
  onClose,
}: {
  session: CashSession | null;
  /** Efectivo esperado calculado por el servidor. */
  expected?: string;
  onClose: () => void;
}) {
  const { organizationId, money: formatMoney } = useOrganization();
  const idem = useIdempotency();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { counted: '' },
  });
  const counted = useWatch({ control: form.control, name: 'counted' });
  const preview =
    expected && /^\d+(\.\d+)?$/.test(counted)
      ? subtractDecimal(counted, expected)
      : null;

  const mutation = useApiMutation({
    mutationFn: (values: Values) =>
      closeSession(organizationId, session!.id, values, idem.keyFor(values)),
    invalidate: [cashKeys.all(organizationId)],
    successMessage: (closed: CashSession) =>
      `Caja cerrada. Diferencia: ${formatMoney(closed.difference ?? '0')}`,
    onSuccess: () => {
      idem.renew();
      form.reset();
      onClose();
    },
  });

  return (
    <FormDialog
      open={session !== null}
      onClose={onClose}
      title="Cerrar caja"
      description="Cuenta el efectivo en caja. El cierre no se puede modificar después."
      submitLabel="Cerrar caja"
      pending={mutation.isPending}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      {expected ? (
        <p className="text-sm">
          Efectivo esperado: <strong>{formatMoney(expected)}</strong>
        </p>
      ) : null}
      <FormField
        id="counted"
        label="Efectivo contado"
        error={form.formState.errors.counted?.message}
      >
        <Input
          id="counted"
          inputMode="decimal"
          autoFocus
          {...form.register('counted')}
        />
      </FormField>
      {preview !== null ? (
        <p className="text-sm" aria-live="polite">
          Diferencia:{' '}
          <Badge
            tone={
              preview === '0' || /^-?0(\.0+)?$/.test(preview)
                ? 'success'
                : 'warning'
            }
          >
            {formatMoney(preview)}
          </Badge>
        </p>
      ) : null}
    </FormDialog>
  );
}
