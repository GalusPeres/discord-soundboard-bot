import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
  primary: 'bg-[#17396b] text-[#9bcfff] border border-[#3f6ea9]',
  success: 'bg-[#143d31] text-[#89f3c8] border border-[#2c7f62]',
  warning: 'bg-[#4a3515] text-[#ffd48c] border border-[#8f6a2a]'
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneStyles[tone], className)}
      {...props}
    />
  );
}
