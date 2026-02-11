import { apiFormData, apiGet, apiJson } from '@/shared/apiClient';
import type { SoundItem, SoundsResponse } from '@/shared/types/api';

export function fetchSounds(): Promise<SoundsResponse> {
  return apiGet<SoundsResponse>('/api/sounds');
}

export function playSound(soundName: string, guildId: string): Promise<{ success: boolean }> {
  return apiJson<{ success: boolean }>('/api/sounds/play', 'POST', { soundName, guildId });
}

export async function uploadSound(params: {
  file: File;
  soundName?: string;
  overwrite?: boolean;
}): Promise<{ sound: SoundItem; success: boolean }> {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.soundName) {
    formData.append('soundName', params.soundName);
  }
  if (params.overwrite) {
    formData.append('overwrite', 'true');
  }
  return apiFormData<{ sound: SoundItem; success: boolean }>('/api/sounds/upload', formData);
}

export function renameSound(oldName: string, newName: string): Promise<{ success: boolean; sound: SoundItem }> {
  return apiJson<{ success: boolean; sound: SoundItem }>(`/api/sounds/${encodeURIComponent(oldName)}`, 'PATCH', {
    newName
  });
}

export function deleteSound(soundName: string): Promise<{ success: boolean }> {
  return apiJson<{ success: boolean }>(`/api/sounds/${encodeURIComponent(soundName)}`, 'DELETE');
}
