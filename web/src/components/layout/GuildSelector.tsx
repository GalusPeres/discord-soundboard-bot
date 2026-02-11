import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { GuildSummary } from '@/shared/types/api';
import { cn } from '@/shared/utils/cn';

export function GuildSelector({
  guilds,
  selectedGuildId,
  onChange,
  disabled,
  className
}: {
  guilds: GuildSummary[];
  selectedGuildId: string | null;
  onChange: (guildId: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      <RadixSelect.Root
        value={selectedGuildId ?? ''}
        onValueChange={(guildId) => {
          if (guildId) {
            onChange(guildId);
          }
        }}
        disabled={disabled || guilds.length === 0}
      >
        <RadixSelect.Trigger
          id="guild-select"
          className={cn(
            'no-focus-ring inline-flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border border-transparent bg-[#1f2740] px-3 text-left text-sm font-semibold text-[var(--color-text)] transition',
            'hover:bg-[#242b40] data-[state=open]:bg-[#2d3450] focus-visible:outline-none focus-visible:bg-[#2d3450] focus-visible:shadow-none',
            'data-[placeholder]:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60'
          )}
          aria-label="Select server"
        >
          <RadixSelect.Value placeholder="Select server" />
          <RadixSelect.Icon className="text-[var(--color-text-muted)]">
            <ChevronDown size={14} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            align="start"
            alignOffset={-1}
            sideOffset={6}
            className="no-focus-ring z-50 w-[calc(var(--radix-select-trigger-width)+2px)] min-w-[calc(var(--radix-select-trigger-width)+2px)] overflow-hidden rounded-[var(--radius-lg)] border border-[#1f2d4a] bg-[linear-gradient(180deg,#0f182e,#0c1326)] shadow-[var(--shadow-lg)]"
          >
            <RadixSelect.Viewport className="space-y-1 p-1">
              {guilds.map((guild) => (
                <RadixSelect.Item
                  key={guild.id}
                  value={guild.id}
                  className={cn(
                    'no-focus-ring relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-md)] px-3 py-2 pr-8 text-sm font-semibold text-[var(--color-text-muted)] outline-none transition',
                    'data-[highlighted]:bg-[#242b40] data-[highlighted]:text-[var(--color-text)]',
                    'data-[state=checked]:bg-[#2d3450] data-[state=checked]:text-[var(--color-text)]'
                  )}
                >
                  <RadixSelect.ItemText>{guild.name}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center text-[#9cb5e9]">
                    <Check size={14} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
