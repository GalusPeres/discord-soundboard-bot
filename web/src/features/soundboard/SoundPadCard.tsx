import { Play, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { SoundItem } from '@/shared/types/api';

export function SoundPadCard({
  sound,
  onPlay,
  onPreview,
  isPlaying,
  noticeMessage
}: {
  sound: SoundItem;
  onPlay: (soundName: string) => void;
  onPreview: (previewUrl: string) => void;
  isPlaying: boolean;
  noticeMessage: string | null;
}) {
  return (
    <Card className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{sound.name}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{(sound.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {sound.isTop ? <Badge tone="primary">Top</Badge> : null}
          {sound.isNew ? <Badge tone="success">New</Badge> : null}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <div className="relative flex-1">
          {noticeMessage ? (
            <div className="pointer-events-none absolute -top-2 left-0 right-0 z-10 -translate-y-full">
              <div className="rounded-[var(--radius-md)] border border-[#394a73] bg-[#101a31] px-3 py-2 text-xs font-semibold text-[#dce5fb] shadow-[var(--shadow-md)]">
                {noticeMessage}
              </div>
            </div>
          ) : null}
          <Button
            size="sm"
            className="w-full"
            onClick={() => onPlay(sound.name)}
            disabled={isPlaying}
            data-testid={`sound-play-${sound.name}`}
          >
            <Play size={14} />
            {isPlaying ? 'Playing...' : 'Play'}
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPreview(sound.previewUrl)}
          aria-label={`Preview ${sound.name}`}
          data-testid={`sound-preview-${sound.name}`}
        >
          <Volume2 size={14} />
          Preview
        </Button>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">Played {sound.playCount} times</p>
    </Card>
  );
}
