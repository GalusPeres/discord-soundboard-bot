import { Menu } from 'lucide-react';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { Button } from '@/components/ui/Button';
import type { UserSummary } from '@/shared/types/api';
import { RefreshCcw } from 'lucide-react';

export function TopBar({
  title,
  guildName,
  user,
  authenticated,
  authLoading,
  onLogin,
  onLogout,
  loggingOut,
  isSidebarOpen,
  onToggleSidebar,
  showSoundboardRefresh,
  onSoundboardRefresh
}: {
  title: string;
  guildName?: string;
  user: UserSummary | null;
  authenticated: boolean;
  authLoading: boolean;
  onLogin: () => void;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  showSoundboardRefresh?: boolean;
  onSoundboardRefresh?: () => void;
}) {
  return (
    <header className="relative z-40 border-b border-[#323a53] bg-[#1f2435] px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          className="lg:hidden"
          aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
          onClick={onToggleSidebar}
        >
          <Menu size={16} />
        </Button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-[var(--color-text)]">{title}</h2>
          {guildName ? <p className="truncate text-sm text-[var(--color-text-muted)]">{guildName}</p> : null}
        </div>

        {showSoundboardRefresh && authenticated ? (
          <Button
            variant="secondary"
            size="sm"
            className="h-10 px-3"
            aria-label="Refresh soundboard"
            onClick={() => {
              onSoundboardRefresh?.();
            }}
          >
            <RefreshCcw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        ) : null}

        {authLoading ? (
          <Button size="sm" className="h-10 px-4" disabled>
            Loading...
          </Button>
        ) : authenticated && user ? (
          <ProfileMenu user={user} onLogout={onLogout} loggingOut={loggingOut} />
        ) : (
          <Button size="sm" className="h-10 px-4" onClick={onLogin}>
            Login with Discord
          </Button>
        )}
      </div>
    </header>
  );
}
