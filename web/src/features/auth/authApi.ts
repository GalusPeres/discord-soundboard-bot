import { apiGet, apiJson } from '@/shared/apiClient';
import type { SessionResponse } from '@/shared/types/api';

export const DISCORD_LOGIN_URL = '/auth/discord/login';

export function fetchSession(): Promise<SessionResponse> {
  return apiGet<SessionResponse>('/auth/session');
}

export async function logout(): Promise<void> {
  await apiJson<{ success: boolean }>('/auth/logout', 'POST');
}

export async function selectGuild(guildId: string): Promise<void> {
  await apiJson<{ success: boolean }>('/api/guilds/select', 'POST', { guildId });
}
