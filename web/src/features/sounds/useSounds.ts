import { useCallback, useEffect, useState } from 'react';
import { fetchSounds } from '@/features/sounds/soundsApi';
import type { SoundItem } from '@/shared/types/api';

export function useSounds({ enabled = true }: { enabled?: boolean } = {}) {
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setSounds([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchSounds();
      setSounds(result.sounds);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to load sounds';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sounds, loading, error, reload };
}
