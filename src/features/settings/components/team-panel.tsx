'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useOrganization } from '@/components/providers/organization-context';
import { Badge } from '@/components/ui/data/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { ClientPaged } from '@/components/ui/data/client-paged';
import { EmptyBlock, QueryState } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/data/table';
import { useApiMutation } from '@/lib/hooks/use-api-mutation';
import { useBranches } from '@/lib/queries/reference';
import {
  fetchInvitations,
  fetchMembers,
  inviteMember,
  revokeInvitation,
  settingsKey,
  settingsPrefix,
  updateMember,
} from '../api';
import {
  ASSIGNABLE_ROLES,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type Invitation,
  type Member,
} from '../types';

const schema = z
  .object({
    email: z.string(),
    role: z.enum(ASSIGNABLE_ROLES),
    allBranches: z.boolean(),
    branchIds: z.array(z.string()),
    permissions: z.array(z.string()),
  })
  .refine((v) => v.allBranches || v.branchIds.length > 0, {
    path: ['branchIds'],
    message: 'Elige al menos una sucursal o marca todas',
  });
type Values = z.infer<typeof schema>;

export function TeamPanel() {
  const { organizationId, dateTime } = useOrganization();
  const members = useQuery({
    queryKey: settingsKey(organizationId, 'members'),
    queryFn: ({ signal }) => fetchMembers(organizationId, signal),
    select: (page) => page.items,
  });
  const invitations = useQuery({
    queryKey: settingsKey(organizationId, 'invitations'),
    queryFn: ({ signal }) => fetchInvitations(organizationId, signal),
    select: (page) => page.items,
  });
  const [dialog, setDialog] = useState<Member | 'invite' | null>(null);
  const revoke = useApiMutation({
    mutationFn: (i: Invitation) => revokeInvitation(organizationId, i.id),
    invalidate: [settingsPrefix(organizationId)],
    successMessage: 'Invitación revocada',
  });
  const state = (i: Invitation) =>
    i.usedAt ? (
      <Badge tone="success">Aceptada</Badge>
    ) : i.revokedAt ? (
      <Badge tone="danger">Revocada</Badge>
    ) : new Date(i.expiresAt) < new Date() ? (
      <Badge>Vencida</Badge>
    ) : (
      <Badge tone="info">Pendiente</Badge>
    );
  const pending = (i: Invitation) =>
    !i.usedAt && !i.revokedAt && new Date(i.expiresAt) >= new Date();

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="team-members">
        <div className="flex items-center justify-between">
          <h2 id="team-members" className="text-base font-semibold">
            Miembros
          </h2>
          <Button onClick={() => setDialog('invite')}>Invitar usuario</Button>
        </div>
        <QueryState
          query={members}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyBlock title="Sin miembros" />}
        >
          {(all) => (
            <ClientPaged items={all}>
              {(items) => (
                <Table>
                  <THead>
                    <TR>
                      <TH>Usuario</TH>
                      <TH>Rol</TH>
                      <TH>Acceso</TH>
                      <TH>
                        <span className="sr-only">Acciones</span>
                      </TH>
                    </TR>
                  </THead>
                  <tbody>
                    {items.map((m) => (
                      <TR key={m.id}>
                        <TD>
                          <span className="font-medium">{m.user.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {m.user.email}
                          </span>
                        </TD>
                        <TD>
                          {ROLE_LABELS[m.role]}
                          {m.permissions.length ? (
                            <span className="block text-xs text-muted-foreground">
                              {m.permissions.length} permiso(s) extra
                            </span>
                          ) : null}
                        </TD>
                        <TD>
                          {m.allBranches
                            ? 'Todas las sucursales'
                            : `${m.branches.length} sucursal(es)`}
                        </TD>
                        <TD>
                          {m.role !== 'OWNER' ? (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDialog(m)}
                              >
                                Editar acceso
                              </Button>
                            </div>
                          ) : null}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </ClientPaged>
          )}
        </QueryState>
      </section>

      <section className="space-y-3" aria-labelledby="team-invitations">
        <h2 id="team-invitations" className="text-base font-semibold">
          Invitaciones
        </h2>
        <QueryState
          query={invitations}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyBlock
              title="No hay invitaciones"
              description="Invita a tu equipo por correo; el enlace vence en 48 horas."
            />
          }
        >
          {(all) => (
            <ClientPaged items={all}>
              {(items) => (
                <Table>
                  <THead>
                    <TR>
                      <TH>Correo</TH>
                      <TH>Rol</TH>
                      <TH>Vence</TH>
                      <TH>Estado</TH>
                      <TH>
                        <span className="sr-only">Acciones</span>
                      </TH>
                    </TR>
                  </THead>
                  <tbody>
                    {items.map((i) => (
                      <TR key={i.id}>
                        <TD>{i.email}</TD>
                        <TD>{ROLE_LABELS[i.role]}</TD>
                        <TD>{dateTime(i.expiresAt)}</TD>
                        <TD>{state(i)}</TD>
                        <TD>
                          {pending(i) ? (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={revoke.isPending}
                                onClick={() => revoke.mutate(i)}
                              >
                                Revocar
                              </Button>
                            </div>
                          ) : null}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </ClientPaged>
          )}
        </QueryState>
      </section>

      <AccessDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function AccessDialog({
  target,
  onClose,
}: {
  target: Member | 'invite' | null;
  onClose: () => void;
}) {
  const { organizationId } = useOrganization();
  const branches = useBranches(organizationId);
  const member = target && target !== 'invite' ? target : null;
  const inviting = target === 'invite';
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      role: 'CASHIER',
      allBranches: true,
      branchIds: [],
      permissions: [],
    },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (target === null) return;
    form.reset(
      member
        ? {
            email: '',
            role: member.role === 'OWNER' ? 'ADMIN' : member.role,
            allBranches: member.allBranches,
            branchIds: member.branches.map((b) => b.branchId),
            permissions: member.permissions,
          }
        : {
            email: '',
            role: 'CASHIER',
            allBranches: true,
            branchIds: [],
            permissions: [],
          },
    );
  }, [target, member, form]);

  const invalidate = [settingsPrefix(organizationId)];
  const save = useApiMutation({
    mutationFn: (v: Values) => {
      const body = {
        role: v.role,
        allBranches: v.allBranches,
        branchIds: v.allBranches ? [] : v.branchIds,
        permissions: v.permissions,
      };
      if (member) return updateMember(organizationId, member.id, body);
      const email = z
        .email('Ingresa un correo válido')
        .parse(v.email.trim().toLowerCase());
      return inviteMember(organizationId, { ...body, email });
    },
    invalidate,
    successMessage: member
      ? 'Acceso actualizado'
      : 'Invitación enviada por correo',
    onSuccess: onClose,
  });
  const revokeAccess = useApiMutation({
    mutationFn: () => {
      const v = form.getValues();
      return updateMember(organizationId, member!.id, {
        role: v.role,
        allBranches: v.allBranches,
        branchIds: v.allBranches ? [] : v.branchIds,
        permissions: v.permissions,
        revoked: true,
      });
    },
    invalidate,
    successMessage: 'Acceso revocado',
    onSuccess: onClose,
  });

  const allBranches = useWatch({ control: form.control, name: 'allBranches' });

  return (
    <FormDialog
      open={target !== null}
      onClose={onClose}
      title={
        inviting ? 'Invitar usuario' : `Acceso de ${member?.user.name ?? ''}`
      }
      description={
        inviting
          ? 'Recibirá un enlace por correo (vigente 48 horas) para crear su cuenta.'
          : member?.user.email
      }
      submitLabel={inviting ? 'Enviar invitación' : 'Guardar'}
      pending={save.isPending || revokeAccess.isPending}
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
    >
      {inviting ? (
        <FormField id="t-email" label="Correo" error={errors.email?.message}>
          <Input id="t-email" type="email" {...form.register('email')} />
        </FormField>
      ) : null}
      <FormField id="t-role" label="Rol" error={errors.role?.message}>
        <Select id="t-role" {...form.register('role')}>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </FormField>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Sucursales</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('allBranches')} /> Todas las
          sucursales
        </label>
        {!allBranches
          ? branches.data?.map((b) => (
              <label
                key={b.id}
                className="ml-6 flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  value={b.id}
                  {...form.register('branchIds')}
                />{' '}
                {b.name}
              </label>
            ))
          : null}
        {errors.branchIds ? (
          <p role="alert" className="text-sm text-danger">
            {errors.branchIds.message}
          </p>
        ) : null}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Permisos adicionales al rol
        </legend>
        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              value={key}
              {...form.register('permissions')}
            />{' '}
            {label}
          </label>
        ))}
      </fieldset>
      {member ? (
        <div className="border-t border-border pt-3">
          <Button
            variant="outline"
            disabled={revokeAccess.isPending}
            onClick={() => revokeAccess.mutate()}
          >
            Revocar acceso a la tienda
          </Button>
        </div>
      ) : null}
    </FormDialog>
  );
}
