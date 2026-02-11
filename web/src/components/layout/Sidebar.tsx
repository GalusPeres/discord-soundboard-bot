import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { FolderCog, LayoutGrid, Menu, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { GuildSelector } from '@/components/layout/GuildSelector';
import { Button } from '@/components/ui/Button';
import type { GuildSummary } from '@/shared/types/api';

const primaryItems = [
  { to: '/app/soundboard', label: 'Soundboard', icon: LayoutGrid },
  { to: '/app/manage', label: 'Manage Sounds', icon: FolderCog }
] as const;

const configItems = [{ to: '/app/settings', label: 'Settings', icon: SlidersHorizontal }] as const;

function NavSection({
  title,
  items,
  onNavigate,
  disabled
}: {
  title: string;
  items: ReadonlyArray<{ to: string; label: string; icon: ComponentType<{ size?: number }> }>;
  onNavigate?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa5c4]">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          if (disabled) {
            return (
              <div
                key={item.to}
                className="pointer-events-none flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[#657397] opacity-70"
                aria-disabled="true"
              >
                <Icon size={16} />
                {item.label}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-[#2d3450] text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[#242b40] hover:text-[var(--color-text)]'
                )
              }
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({
  guilds,
  selectedGuildId,
  onGuildChange,
  authenticated,
  mobile,
  onNavigate,
  onClose
}: {
  guilds: GuildSummary[];
  selectedGuildId: string | null;
  onGuildChange: (guildId: string) => void;
  authenticated?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const selectedGuildName = guilds.find((guild) => guild.id === selectedGuildId)?.name;

  return (
    <aside
      className={cn(
        'scrollbar-subtle flex h-screen w-72 flex-col overflow-y-auto border-r border-[#2f3750] bg-[#1a1f2d]',
        mobile ? 'w-full max-w-[18rem]' : ''
      )}
      aria-label="Primary"
    >
      <div
        className={
          mobile
            ? 'border-b border-[#323a53] bg-[#1f2435] px-4 py-3'
            : 'px-4 pb-4 pt-4'
        }
      >
        {mobile ? (
          <div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                aria-label="Close navigation"
                onClick={() => {
                  onClose?.();
                }}
              >
                <Menu size={16} />
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold text-[var(--color-text)]">Soundboard</h2>
                {selectedGuildName ? <p className="truncate text-sm text-[var(--color-text-muted)]">{selectedGuildName}</p> : null}
              </div>
            </div>

            <div className="mt-3">
              <GuildSelector
                guilds={guilds}
                selectedGuildId={selectedGuildId}
                onChange={(guildId) => {
                  onGuildChange(guildId);
                  onNavigate?.();
                }}
                disabled={!authenticated || guilds.length === 0}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center px-2">
              <h1 className="text-[1.9rem] font-bold leading-none tracking-[0.01em]">Soundboard</h1>
            </div>

            <GuildSelector
              guilds={guilds}
              selectedGuildId={selectedGuildId}
              onChange={(guildId) => {
                onGuildChange(guildId);
                onNavigate?.();
              }}
              disabled={!authenticated || guilds.length === 0}
              className="w-full"
            />
          </>
        )}
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="mb-4 h-px w-full bg-[#2b334b]" aria-hidden="true" />
        <NavSection title="Main" items={primaryItems} onNavigate={onNavigate} disabled={!authenticated} />
        <div className="mb-4 h-px w-full bg-[#2b334b]" aria-hidden="true" />
        <NavSection
          title="Server Management"
          items={configItems}
          onNavigate={onNavigate}
          disabled={!authenticated}
        />
      </div>
    </aside>
  );
}
