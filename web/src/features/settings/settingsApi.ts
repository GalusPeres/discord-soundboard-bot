import { apiGet, apiJson } from '@/shared/apiClient';

export type SettingsResponse = {
  prefix: string;
  maxFileSizeBytes: number;
  maxFilenameLength: number;
};

export function fetchSettings(): Promise<SettingsResponse> {
  return apiGet<SettingsResponse>('/api/settings');
}

export function updateSettings(prefix: string): Promise<{ success: boolean; prefix: string }> {
  return apiJson<{ success: boolean; prefix: string }>('/api/settings', 'PATCH', { prefix });
}
