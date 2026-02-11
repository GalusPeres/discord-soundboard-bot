import { Download, PencilLine, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { SoundItem } from '@/shared/types/api';

export function ManageSoundCard({
  sound,
  onPreview,
  onRename,
  onDelete
}: {
  sound: SoundItem;
  onPreview: (sound: SoundItem) => void;
  onRename: (sound: SoundItem) => void;
  onDelete: (sound: SoundItem) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{sound.name}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {new Date(sound.modifiedAt).toLocaleDateString()} • {(sound.sizeBytes / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <div className="flex gap-1">
          {sound.isTop ? <Badge tone="primary">Top</Badge> : null}
          {sound.isNew ? <Badge tone="success">New</Badge> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" size="sm" onClick={() => onPreview(sound)}>
          <Play size={14} />
          Preview
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onRename(sound)}>
          <PencilLine size={14} />
          Rename
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.open(sound.downloadUrl, '_blank', 'noopener,noreferrer')}>
          <Download size={14} />
          Download
        </Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(sound)}>
          <Trash2 size={14} />
          Delete
        </Button>
      </div>
    </Card>
  );
}
