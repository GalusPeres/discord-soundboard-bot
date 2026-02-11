import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/features/auth/AuthContext';
import { DISCORD_LOGIN_URL } from '@/features/auth/authApi';
import { notify } from '@/components/ui/Toast';

const PAGE_TITLES: Record<string, string> = {
  '/app/soundboard': 'Soundboard',
  '/app/manage': 'Manage Sounds',
  '/app/settings': 'Settings'
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { session, loading: authLoading, selectedGuildId, setSelectedGuildId, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const title = useMemo(() => PAGE_TITLES[location.pathname] ?? 'Dashboard', [location.pathname]);
  const guildName = useMemo(
    () => session.guilds.find((guild) => guild.id === selectedGuildId)?.name,
    [session.guilds, selectedGuildId]
  );
  const isSoundboardPage = location.pathname === '/app/soundboard';

  const handleGuildChange = (guildId: string) => {
    if (!session.authenticated) {
      return;
    }

    void (async () => {
      try {
        await setSelectedGuildId(guildId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to switch guild';
        notify.error(message);
      }
    })();
  };

  const handleLogout = async () => {
    if (!session.authenticated) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      notify.error(message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="hidden lg:block">
        <Sidebar
          guilds={session.guilds}
          selectedGuildId={selectedGuildId}
          onGuildChange={handleGuildChange}
          authenticated={session.authenticated}
        />
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <Sidebar
            guilds={session.guilds}
            selectedGuildId={selectedGuildId}
            onGuildChange={handleGuildChange}
            authenticated={session.authenticated}
            mobile
            onNavigate={() => setIsSidebarOpen(false)}
            onClose={() => setIsSidebarOpen(false)}
          />
          <button
            type="button"
            className="h-full flex-1 bg-black/60"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-elevated)]">
        <TopBar
          title={title}
          guildName={guildName}
          user={session.user}
          authenticated={session.authenticated}
          authLoading={authLoading}
          onLogin={() => {
            window.location.href = DISCORD_LOGIN_URL;
          }}
          onLogout={handleLogout}
          loggingOut={isLoggingOut}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          showSoundboardRefresh={isSoundboardPage}
          onSoundboardRefresh={() => {
            window.dispatchEvent(new Event('soundboard:refresh'));
          }}
        />
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto w-full max-w-[1550px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
