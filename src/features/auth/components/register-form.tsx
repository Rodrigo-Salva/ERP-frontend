'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/forms/form-field';
import { Input } from '@/components/ui/forms/input';
import { registerSchema, type RegisterInput } from '@/lib/schemas/auth';
import { register as registerAccount } from '../api';

/** Moneda y país no se asumen: se piden explícitamente; idioma y zona se proponen del navegador. */
function browserDefaults() {
  if (typeof window === 'undefined') return { locale: '', timeZone: '' };
  return {
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      organizationName: '',
      branchName: 'Principal',
      currency: '',
      ...browserDefaults(),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterInput) =>
      registerAccount(registerSchema.parse(values) as RegisterInput),
    onSuccess: () => {
      router.replace('/');
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
      className="space-y-4"
    >
      <FormField id="name" label="Tu nombre" error={errors.name?.message}>
        <Input id="name" autoComplete="name" {...register('name')} />
      </FormField>
      <FormField id="email" label="Correo" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          {...register('email')}
        />
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
          {...register('password')}
        />
      </FormField>
      <FormField
        id="organizationName"
        label="Nombre de la tienda"
        error={errors.organizationName?.message}
      >
        <Input id="organizationName" {...register('organizationName')} />
      </FormField>
      <FormField
        id="branchName"
        label="Primera sucursal"
        error={errors.branchName?.message}
      >
        <Input id="branchName" {...register('branchName')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="currency"
          label="Moneda"
          error={errors.currency?.message}
        >
          <Input
            id="currency"
            placeholder="PEN"
            className="uppercase"
            {...register('currency')}
          />
        </FormField>
        <FormField
          id="locale"
          label="Idioma / región"
          error={errors.locale?.message}
        >
          <Input id="locale" {...register('locale')} />
        </FormField>
        <FormField
          id="timeZone"
          label="Zona horaria"
          error={errors.timeZone?.message}
        >
          <Input id="timeZone" {...register('timeZone')} />
        </FormField>
      </div>
      {mutation.error ? (
        <p role="alert" className="text-sm text-danger">
          {mutation.error.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creando…' : 'Crear tienda'}
      </Button>
    </form>
  );
}
