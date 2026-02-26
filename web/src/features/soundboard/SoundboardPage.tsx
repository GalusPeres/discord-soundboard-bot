import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
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
  const [playNotice, setPlayNotice] = useState<{ soundName: string; message: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 160);
  const searchTerm = debouncedSearch.trim().toLowerCase();

  const topSounds = useMemo(() => [...sounds].sort((a, b) => b.playCount - a.playCount).slice(0, 24), [sounds]);
  const newSounds = useMemo(
    () => [...sounds].sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 24),
    [sounds]
  );

  const allFilteredSounds = useMemo(() => {
    if (!searchTerm) {
      return sounds;
    }
    return sounds.filter((sound) => sound.name.toLowerCase().includes(searchTerm));
  }, [searchTerm, sounds]);

  const topFilteredSounds = useMemo(() => {
    if (!searchTerm) {
      return topSounds;
    }
    return topSounds.filter((sound) => sound.name.toLowerCase().includes(searchTerm));
  }, [searchTerm, topSounds]);

  const newFilteredSounds = useMemo(() => {
    if (!searchTerm) {
      return newSounds;
    }
    return newSounds.filter((sound) => sound.name.toLowerCase().includes(searchTerm));
  }, [newSounds, searchTerm]);

  const activeSounds = useMemo(() => {
    if (activeTab === 'top') {
      return topFilteredSounds;
    }
    if (activeTab === 'new') {
      return newFilteredSounds;
    }
    return allFilteredSounds;
  }, [activeTab, allFilteredSounds, newFilteredSounds, topFilteredSounds]);

  const activeEmptyText = useMemo(() => {
    if (activeTab === 'top') {
      return 'No top sounds available for this filter.';
    }
    if (activeTab === 'new') {
      return 'No recent sounds available for this filter.';
    }
    return 'No sounds match your search.';
  }, [activeTab]);

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

  useEffect(() => {
    const handleExternalRefresh = () => {
      void reload({ background: true });
    };

    window.addEventListener('soundboard:refresh', handleExternalRefresh);
    return () => {
      window.removeEventListener('soundboard:refresh', handleExternalRefresh);
    };
  }, [reload]);

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

  const handlePlay = (sound: SoundItem) => {
    void (async () => {
      const soundName = sound.name;
      if (!selectedGuildId) {
        showPlayNotice(soundName, 'Select a guild before playing sounds.');
        return;
      }

      try {
        await playSound(soundName, selectedGuildId);
        await reload({ background: true });
      } catch (playError) {
        const message = playError instanceof Error ? playError.message : 'Unable to play sound';
        showPlayNotice(soundName, message);
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
    <section className="flex h-full min-h-0 flex-1 flex-col gap-4 bg-[var(--color-bg-soundboard)]">
      <TabsRoot value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'top' | 'new')} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3">
          <TabsList className="w-fit shrink-0">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="top">Top</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>

          <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sounds"
              className="pl-9"
              aria-label="Search sounds"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4 min-h-0 flex-1">
          <SoundGrid
            sounds={activeSounds}
            onPlay={handlePlay}
            onPreview={handlePreview}
            playNotice={playNotice}
            emptyText={activeEmptyText}
          />
        </TabsContent>
      </TabsRoot>
    </section>
  );
}

function SoundGrid({
  sounds,
  onPlay,
  onPreview,
  playNotice,
  emptyText
}: {
  sounds: SoundItem[];
  onPlay: (sound: SoundItem) => void;
  onPreview: (previewUrl: string) => void;
  playNotice: { soundName: string; message: string } | null;
  emptyText: string;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  const updateExternalScrollbar = useCallback(() => {
    const content = contentRef.current;
    const rail = railRef.current;
    const spacer = spacerRef.current;
    if (!content || !rail || !spacer) {
      return;
    }

    const hasOverflow = content.scrollHeight > content.clientHeight + 1;
    spacer.style.height = `${content.scrollHeight}px`;
    rail.style.display = hasOverflow ? 'block' : 'none';
    if (hasOverflow) {
      rail.scrollTop = content.scrollTop;
    }
  }, []);

  useEffect(() => {
    updateExternalScrollbar();
  }, [sounds.length, updateExternalScrollbar]);

  useEffect(() => {
    const handleResize = () => {
      updateExternalScrollbar();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateExternalScrollbar]);

  if (sounds.length === 0) {
    return <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="relative h-full">
      <div
        ref={contentRef}
        className="scrollbar-hidden h-full overflow-x-hidden overflow-y-auto"
        onScroll={(event) => {
          if (syncingRef.current) {
            return;
          }
          const rail = railRef.current;
          if (!rail) {
            return;
          }
          syncingRef.current = true;
          rail.scrollTop = event.currentTarget.scrollTop;
          syncingRef.current = false;
        }}
      >
        <div className="grid content-start gap-3 pb-4 sm:pb-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sounds.map((sound) => (
            <SoundPadCard
              key={sound.name}
              sound={sound}
              onPlay={onPlay}
              onPreview={onPreview}
              noticeMessage={playNotice?.soundName === sound.name ? playNotice.message : null}
            />
          ))}
        </div>
      </div>

      <div
        ref={railRef}
        className="scrollbar-subtle absolute inset-y-0 right-[-14px] w-[10px] overflow-x-hidden overflow-y-scroll sm:right-[-18px]"
        onScroll={(event) => {
          if (syncingRef.current) {
            return;
          }
          const content = contentRef.current;
          if (!content) {
            return;
          }
          syncingRef.current = true;
          content.scrollTop = event.currentTarget.scrollTop;
          syncingRef.current = false;
        }}
      >
        <div ref={spacerRef} className="w-px" />
      </div>
    </div>
  );
}
