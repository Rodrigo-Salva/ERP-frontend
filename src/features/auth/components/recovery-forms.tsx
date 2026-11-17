'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { useHashToken } from '@/lib/hooks/use-hash-token';
import {
  acceptSchema,
  forgotSchema,
  resetSchema,
  type AcceptInput,
  type ForgotInput,
  type ResetInput,
} from '@/lib/schemas/auth';
import { acceptInvitation, requestPasswordReset, resetPassword } from '../api';

function Done({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="space-y-3">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href="/login"
        className="text-sm font-medium text-primary underline"
      >
        Ir a iniciar sesión
      </Link>
    </div>
  );
}

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function ForgotPasswordForm() {
  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });
  const mutation = useMutation({
    mutationFn: (v: ForgotInput) => requestPasswordReset(v),
  });

  if (mutation.isSuccess)
    return (
      <Done
        title="Revisa tu correo"
        text="Si la cuenta existe, te enviamos un enlace para crear una nueva contraseña. Vence en 30 minutos."
      />
    );
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4"
    >
      <FormField
        id="email"
        label="Correo de tu cuenta"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="username"
          {...form.register('email')}
        />
      </FormField>
      <ErrorText message={mutation.error?.message} />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const token = useHashToken();
  const form = useForm<Omit<ResetInput, 'token'>>({
    resolver: zodResolver(resetSchema.omit({ token: true })),
    defaultValues: { password: '' },
  });
  const mutation = useMutation({
    mutationFn: (v: Omit<ResetInput, 'token'>) =>
      resetPassword({ ...v, token: token ?? '' }),
  });

  if (mutation.isSuccess)
    return (
      <Done
        title="Contraseña actualizada"
        text="Por seguridad cerramos tus sesiones anteriores. Inicia sesión con la nueva contraseña."
      />
    );
  if (token === null)
    return (
      <ErrorText message="El enlace no es válido. Solicita uno nuevo desde «¿Olvidaste tu contraseña?»." />
    );
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4"
    >
      <FormField
        id="password"
        label="Nueva contraseña (mínimo 12 caracteres)"
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </FormField>
      <ErrorText message={mutation.error?.message} />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}

export function AcceptInvitationForm() {
  const token = useHashToken();
  const form = useForm<Omit<AcceptInput, 'token'>>({
    resolver: zodResolver(acceptSchema.omit({ token: true })),
    defaultValues: { name: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (v: Omit<AcceptInput, 'token'>) =>
      acceptInvitation({ ...v, token: token ?? '' }),
  });
  const errors = form.formState.errors;

  if (mutation.isSuccess)
    return (
      <Done
        title="Invitación aceptada"
        text="Ya formas parte de la tienda. Inicia sesión con tu correo y la contraseña que elegiste."
      />
    );
  if (token === null)
    return (
      <ErrorText message="El enlace de invitación no es válido. Pide una nueva al administrador." />
    );
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4"
    >
      <FormField id="name" label="Tu nombre" error={errors.name?.message}>
        <Input id="name" autoComplete="name" {...form.register('name')} />
      </FormField>
      <FormField
        id="password"
        label="Contraseña (mínimo 12 caracteres)"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </FormField>
      <p className="text-xs text-muted-foreground">
        Si ya tienes una cuenta con este correo, usa tu contraseña actual.
      </p>
      <ErrorText message={mutation.error?.message} />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Aceptando…' : 'Aceptar invitación'}
      </Button>
    </form>
  );
}
