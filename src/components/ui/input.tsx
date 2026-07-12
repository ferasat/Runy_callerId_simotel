import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--color-accent)_55%,var(--color-border))] focus:shadow-[0_0_0_3px_rgb(45_212_160/0.12)]',
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none',
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('flex flex-col gap-1.5 text-sm text-[var(--color-muted)]', className)}
      {...props}
    />
  )
}

export function Badge({
  className,
  tone = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'ok' | 'warn' | 'err' }) {
  const tones = {
    default: 'bg-[rgb(148_163_184/0.12)] text-[var(--color-muted)]',
    ok: 'bg-[rgb(45_212_160/0.15)] text-[var(--color-accent)]',
    warn: 'bg-[rgb(251_191_36/0.15)] text-[var(--color-warning)]',
    err: 'bg-[rgb(248_113_113/0.15)] text-[var(--color-danger)]'
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
