import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionResponse } from '@/shared/types/api';
import { fetchSession, logout as logoutRequest, selectGuild } from '@/features/auth/authApi';

export type AuthContextValue = {
  session: SessionResponse;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string) => Promise<void>;
};

const UNAUTHENTICATED_SESSION: SessionResponse = {
  authenticated: false,
  user: null,
  guilds: [],
  selectedGuildId: null
};

const LAST_GUILD_ID_KEY = 'soundboard:lastGuildId';

function readLastGuildId(): string | null {
  try {
    return window.localStorage.getItem(LAST_GUILD_ID_KEY);
  } catch {
    return null;
  }
}

function writeLastGuildId(guildId: string) {
  try {
    window.localStorage.setItem(LAST_GUILD_ID_KEY, guildId);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse>(UNAUTHENTICATED_SESSION);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const nextSession = await fetchSession();
      if (!nextSession.authenticated) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }

      const preferredGuildId = readLastGuildId();
      const canRestorePreferredGuild =
        Boolean(preferredGuildId) &&
        preferredGuildId !== nextSession.selectedGuildId &&
        nextSession.guilds.some((guild) => guild.id === preferredGuildId);

      if (preferredGuildId && canRestorePreferredGuild) {
        try {
          await selectGuild(preferredGuildId);
          setSession({ ...nextSession, selectedGuildId: preferredGuildId });
          writeLastGuildId(preferredGuildId);
          return;
        } catch {
          // Fall through and keep server-selected guild.
        }
      }

      if (nextSession.selectedGuildId) {
        writeLastGuildId(nextSession.selectedGuildId);
      }

      setSession(nextSession);
    } catch {
      setSession(UNAUTHENTICATED_SESSION);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshSession]);

  useEffect(() => {
    const onUnauthorized = () => {
      void refreshSession();
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [refreshSession]);

  const handleLogout = useCallback(async () => {
    await logoutRequest();
    setSession(UNAUTHENTICATED_SESSION);
  }, []);

  const setSelectedGuildId = useCallback(async (guildId: string) => {
    await selectGuild(guildId);
    writeLastGuildId(guildId);
    setSession((prev) => ({ ...prev, selectedGuildId: guildId }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      refreshSession,
      logout: handleLogout,
      selectedGuildId: session.selectedGuildId,
      setSelectedGuildId
    }),
    [session, loading, refreshSession, handleLogout, setSelectedGuildId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
