import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui/Tabs';
import { useAuth } from '@/features/auth/AuthContext';
import { DISCORD_LOGIN_URL } from '@/features/auth/authApi';
import { playSound } from '@/features/sounds/soundsApi';
import { useSounds } from '@/features/sounds/useSounds';
import { SoundPadCard } from '@/features/soundboard/SoundPadCard';
import type { SoundItem } from '@/shared/types/api';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function SoundboardPage() {
  const { session, loading: authLoading, selectedGuildId } = useAuth();
  const { sounds, loading, error, reload } = useSounds({ enabled: session.authenticated && !authLoading });

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'top' | 'new'>('all');
  const [playingSoundName, setPlayingSoundName] = useState<string | null>(null);
  const [playNotice, setPlayNotice] = useState<{ soundName: string; message: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 160);

  const topSounds = useMemo(() => [...sounds].sort((a, b) => b.playCount - a.playCount).slice(0, 24), [sounds]);
  const newSounds = useMemo(
    () => [...sounds].sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 24),
    [sounds]
  );

  const tabSounds = useMemo(() => {
    if (activeTab === 'top') {
      return topSounds;
    }
    if (activeTab === 'new') {
      return newSounds;
    }
    return sounds;
  }, [activeTab, sounds, topSounds, newSounds]);

  const filteredSounds = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) {
      return tabSounds;
    }
    return tabSounds.filter((sound) => sound.name.toLowerCase().includes(term));
  }, [debouncedSearch, tabSounds]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showPlayNotice = (soundName: string, message: string) => {
    setPlayNotice({ soundName, message });
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setPlayNotice(null);
      noticeTimerRef.current = null;
    }, 2200);
  };

  const handlePreview = (previewUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    void audio.play();
  };

  const handlePlay = (soundName: string) => {
    void (async () => {
      if (!selectedGuildId) {
        showPlayNotice(soundName, 'Select a guild before playing sounds.');
        return;
      }

      try {
        setPlayingSoundName(soundName);
        await playSound(soundName, selectedGuildId);
        await reload();
      } catch (playError) {
        const message = playError instanceof Error ? playError.message : 'Unable to play sound';
        showPlayNotice(soundName, message);
      } finally {
        setPlayingSoundName(null);
      }
    })();
  };

  if (authLoading) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">Loading dashboard context...</p>
      </Card>
    );
  }

  if (!session.authenticated) {
    return (
      <section className="w-full py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9fb3df]">Welcome</p>
        <h3 className="mt-3 text-3xl font-semibold sm:text-4xl">Ready to use your soundboard?</h3>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
          Login with Discord from the top-right to load your guild, browse sounds, and trigger pads instantly.
        </p>
        <div className="mt-6">
          <Button size="lg" onClick={() => (window.location.href = DISCORD_LOGIN_URL)}>
            Login with Discord
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">Loading soundboard...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <Button variant="secondary" onClick={() => void reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Sounds" value={String(sounds.length)} />
        <StatCard label="Top Played" value={topSounds[0]?.name ?? '-'} />
        <StatCard label="Newest" value={newSounds[0]?.name ?? '-'} />
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Refresh</p>
            <p className="text-sm text-[var(--color-text)]">Reload latest library state.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            <RefreshCcw size={14} />
            Refresh
          </Button>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sounds"
            className="pl-9"
            aria-label="Search sounds"
          />
        </div>

        <TabsRoot value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'top' | 'new')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="top">Top</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <SoundGrid
              sounds={filteredSounds}
              onPlay={handlePlay}
              onPreview={handlePreview}
              playingSoundName={playingSoundName}
              playNotice={playNotice}
              emptyText="No sounds match your search."
            />
          </TabsContent>
          <TabsContent value="top" className="mt-4">
            <SoundGrid
              sounds={filteredSounds}
              onPlay={handlePlay}
              onPreview={handlePreview}
              playingSoundName={playingSoundName}
              playNotice={playNotice}
              emptyText="No top sounds available for this filter."
            />
          </TabsContent>
          <TabsContent value="new" className="mt-4">
            <SoundGrid
              sounds={filteredSounds}
              onPlay={handlePlay}
              onPreview={handlePreview}
              playingSoundName={playingSoundName}
              playNotice={playNotice}
              emptyText="No recent sounds available for this filter."
            />
          </TabsContent>
        </TabsRoot>
      </Card>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
    </Card>
  );
}

function SoundGrid({
  sounds,
  onPlay,
  onPreview,
  playingSoundName,
  playNotice,
  emptyText
}: {
  sounds: SoundItem[];
  onPlay: (soundName: string) => void;
  onPreview: (previewUrl: string) => void;
  playingSoundName: string | null;
  playNotice: { soundName: string; message: string } | null;
  emptyText: string;
}) {
  if (sounds.length === 0) {
    return <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sounds.map((sound) => (
        <SoundPadCard
          key={sound.name}
          sound={sound}
          onPlay={onPlay}
          onPreview={onPreview}
          isPlaying={playingSoundName === sound.name}
          noticeMessage={playNotice?.soundName === sound.name ? playNotice.message : null}
        />
      ))}
    </div>
  );
}
