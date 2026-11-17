import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 min-w-0 w-full rounded-lg border border-border bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/80 hover:border-muted-foreground/50 focus:border-primary disabled:opacity-50 aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
}
