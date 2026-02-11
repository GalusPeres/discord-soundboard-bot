import { useMemo, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui/Tabs';
import { notify } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { ManageSoundCard } from '@/features/manage/ManageSoundCard';
import { deleteSound, renameSound, uploadSound } from '@/features/sounds/soundsApi';
import { useSounds } from '@/features/sounds/useSounds';
import type { SoundItem } from '@/shared/types/api';

export function ManagePage() {
  const { session, loading: authLoading } = useAuth();
  const { sounds, loading, error, reload } = useSounds({ enabled: session.authenticated && !authLoading });
  const [tab, setTab] = useState<'library' | 'upload'>('library');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [renameTarget, setRenameTarget] = useState<SoundItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SoundItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sortedSounds = useMemo(
    () => [...sounds].sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)),
    [sounds]
  );

  const handleUpload = () => {
    void (async () => {
      if (!uploadFile) {
        notify.error('Choose an MP3 file first.');
        return;
      }

      try {
        setUploading(true);
        await uploadSound({ file: uploadFile, soundName: uploadName.trim() || undefined, overwrite });
        notify.success('Sound uploaded successfully');
        setUploadFile(null);
        setUploadName('');
        setOverwrite(false);
        await reload();
        setTab('library');
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
        notify.error(message);
      } finally {
        setUploading(false);
      }
    })();
  };

  const handlePreview = (sound: SoundItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(sound.previewUrl);
    audioRef.current = audio;
    void audio.play();
  };

  const openRename = (sound: SoundItem) => {
    setRenameTarget(sound);
    setRenameValue(sound.name);
  };

  const submitRename = () => {
    void (async () => {
      if (!renameTarget) {
        return;
      }
      try {
        setRenameSubmitting(true);
        await renameSound(renameTarget.name, renameValue.trim());
        notify.success(`Renamed ${renameTarget.name}`);
        setRenameTarget(null);
        await reload();
      } catch (renameError) {
        const message = renameError instanceof Error ? renameError.message : 'Rename failed';
        notify.error(message);
      } finally {
        setRenameSubmitting(false);
      }
    })();
  };

  const submitDelete = () => {
    void (async () => {
      if (!deleteTarget) {
        return;
      }
      try {
        setDeleteSubmitting(true);
        await deleteSound(deleteTarget.name);
        notify.success(`Deleted ${deleteTarget.name}`);
        setDeleteTarget(null);
        await reload();
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : 'Delete failed';
        notify.error(message);
      } finally {
        setDeleteSubmitting(false);
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
      <section>
        <p className="text-sm text-[var(--color-text-muted)]">
          Login from the top-right button to manage sounds.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">Loading library...</p>
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
      <Card className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Manage Sounds</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Upload new files and maintain your sound library.</p>
        </div>

        <TabsRoot value={tab} onValueChange={(value) => setTab(value as 'library' | 'upload')}>
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            {sortedSounds.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">
                No sounds found.
              </p>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {sortedSounds.map((sound) => (
                  <ManageSoundCard
                    key={sound.name}
                    sound={sound}
                    onPreview={handlePreview}
                    onRename={openRename}
                    onDelete={(item) => setDeleteTarget(item)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <Card className="space-y-4 border-dashed">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <label className="mb-2 block text-sm font-semibold">MP3 File</label>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-surface-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-text)]"
                />
                {uploadFile ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">Selected: {uploadFile.name}</p> : null}
              </div>

              <div>
                <label htmlFor="upload-name" className="mb-2 block text-sm font-semibold">
                  Optional Name
                </label>
                <Input
                  id="upload-name"
                  value={uploadName}
                  maxLength={10}
                  onChange={(event) => setUploadName(event.target.value)}
                  placeholder="letters and numbers only"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} className="h-4 w-4" />
                Overwrite existing file if name already exists
              </label>

              <Button size="lg" onClick={handleUpload} disabled={uploading}>
                <UploadCloud size={16} />
                {uploading ? 'Uploading...' : 'Upload Sound'}
              </Button>
            </Card>
          </TabsContent>
        </TabsRoot>
      </Card>

      <Modal
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
          }
        }}
        title="Rename Sound"
        description="Use a short lowercase name (max 10 characters)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={renameSubmitting || renameValue.trim().length === 0}>
              {renameSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <Input value={renameValue} maxLength={10} onChange={(event) => setRenameValue(event.target.value)} />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Delete Sound"
        description={deleteTarget ? `Delete ${deleteTarget.name}.mp3 permanently?` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
      </Modal>
    </section>
  );
}
