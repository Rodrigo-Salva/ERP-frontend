'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';
import { login } from '../api';

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: (values: LoginInput) => login(loginSchema.parse(values)),
    onSuccess: () => {
      // La cookie ya está puesta: se navega a la raíz, que elige la organización.
      router.replace('/');
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="space-y-4"
    >
      <FormField id="email" label="Correo" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </FormField>
      <FormField
        id="password"
        label="Contraseña"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
      </FormField>
      {mutation.error ? (
        <p role="alert" className="text-sm text-danger">
          {mutation.error.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  );
}
