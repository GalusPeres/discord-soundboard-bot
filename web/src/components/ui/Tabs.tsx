import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export const TabsRoot = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        'inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, children, ...props }: RadixTabs.TabsTriggerProps & { children: ReactNode }) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'inline-flex min-h-8 items-center justify-center rounded-[calc(var(--radius-md)-var(--space-1))] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition',
        'data-[state=active]:bg-[var(--color-surface-soft)] data-[state=active]:text-[var(--color-text)]',
        className
      )}
      {...props}
    >
      {children}
    </RadixTabs.Trigger>
  );
}

export const TabsContent = RadixTabs.Content;
