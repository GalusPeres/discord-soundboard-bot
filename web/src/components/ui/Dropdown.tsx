import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className={cn(
            'no-focus-ring z-50 min-w-[15rem] rounded-[var(--radius-lg)] border border-[#1f2d4a] bg-[linear-gradient(180deg,#0f182e,#0c1326)] p-2 shadow-[var(--shadow-lg)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#afbddf]">{children}</DropdownMenu.Label>;
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[#243250]" />;
}

type DropdownItemProps = ComponentPropsWithoutRef<typeof DropdownMenu.Item> & {
  children: ReactNode;
};

export function DropdownItem({ children, className, ...props }: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        'no-focus-ring flex cursor-pointer items-center rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[var(--color-text)] outline-none transition',
        'hover:bg-[#1a2643] focus:bg-[#1a2643] data-[disabled]:cursor-default data-[disabled]:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Item>
  );
}
