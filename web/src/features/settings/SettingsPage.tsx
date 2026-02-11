import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { notify } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchSettings, updateSettings, type SettingsResponse } from '@/features/settings/settingsApi';

export function SettingsPage() {
  const { session, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.authenticated) {
      setSettings(null);
      setError(null);
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSettings();
        setSettings(data);
        setPrefix(data.prefix);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Failed to load settings';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session.authenticated]);

  const handleSave = () => {
    void (async () => {
      try {
        setSaving(true);
        const result = await updateSettings(prefix);
        setPrefix(result.prefix);
        notify.success('Prefix updated successfully');
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Failed to save settings';
        notify.error(message);
      } finally {
        setSaving(false);
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
          Login from the top-right button to edit server settings.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">Loading settings...</p>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-danger)]">{error ?? 'Unknown settings error'}</p>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <Card className="space-y-3">
        <h3 className="text-xl font-semibold">Bot Settings</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Update core bot behavior values. Prefix changes require a bot restart to take effect.</p>
      </Card>

      <Card className="space-y-4">
        <div className="max-w-md">
          <label htmlFor="prefix-input" className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
            Command Prefix
          </label>
          <Input
            id="prefix-input"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            maxLength={5}
            placeholder="e.g. 8"
          />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">1-5 non-space characters.</p>
        </div>

        <Button onClick={handleSave} disabled={saving || prefix.trim().length === 0 || prefix.trim().length > 5}>
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Max Upload Size</p>
          <p className="mt-2 text-lg font-semibold">{(settings.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Max Filename Length</p>
          <p className="mt-2 text-lg font-semibold">{settings.maxFilenameLength} characters</p>
        </Card>
      </div>
    </section>
  );
}
