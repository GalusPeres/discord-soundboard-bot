import { ChevronDown, LogOut } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/Dropdown';
import type { UserSummary } from '@/shared/types/api';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

export function ProfileMenu({
  user,
  onLogout,
  loggingOut
}: {
  user: UserSummary;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
}) {
  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-transparent px-1.5 text-left transition hover:bg-[var(--color-surface)] data-[state=open]:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-none"
          data-testid="profile-trigger"
          aria-label="Open profile menu"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Profile avatar" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-soft)] text-xs font-bold text-[var(--color-text)]">
              {initialsFromName(user.displayName)}
            </span>
          )}
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
        </button>
      }
    >
      <DropdownLabel>{user.displayName}</DropdownLabel>
      <DropdownItem className="pointer-events-none text-xs text-[var(--color-text-muted)]">ID: {user.id}</DropdownItem>
      <DropdownSeparator />
      <DropdownItem onSelect={() => void onLogout()} data-testid="profile-logout">
        <LogOut className="mr-2" size={14} />
        {loggingOut ? 'Logging out...' : 'Logout'}
      </DropdownItem>
    </Dropdown>
  );
}
