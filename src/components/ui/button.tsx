import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-accent)_40%,var(--color-border))]',
        primary:
          'bg-gradient-to-br from-[var(--color-accent)] to-[#1fad7a] text-[#041016] font-semibold border-0',
        danger:
          'bg-[color-mix(in_srgb,var(--color-danger)_18%,var(--color-elevated))] border border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))] text-[#fecaca]',
        ghost: 'bg-transparent hover:bg-[rgb(148_163_184/0.08)]'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
