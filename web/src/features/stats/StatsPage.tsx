import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/AuthContext';
import { DISCORD_LOGIN_URL } from '@/features/auth/authApi';
import { useSounds } from '@/features/sounds/useSounds';

const RECENT_ACTIVITY_DAYS = 14;

export function StatsPage() {
  const { session, loading: authLoading } = useAuth();
  const { sounds, loading, error, reload } = useSounds({ enabled: session.authenticated && !authLoading });

  const totalPlayCount = useMemo(() => sounds.reduce((sum, sound) => sum + sound.playCount, 0), [sounds]);
  const topSounds = useMemo(() => [...sounds].sort((a, b) => b.playCount - a.playCount).slice(0, 10), [sounds]);
  const newestSounds = useMemo(
    () => [...sounds].sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 10),
    [sounds]
  );
  const maxPlayCount = useMemo(() => Math.max(1, ...topSounds.map((sound) => sound.playCount)), [topSounds]);
  const recentActivity = useMemo(() => buildRecentActivity(sounds, RECENT_ACTIVITY_DAYS), [sounds]);
  const maxRecentActivityCount = useMemo(
    () => Math.max(1, ...recentActivity.map((entry) => entry.count)),
    [recentActivity]
  );
  const recentActivityTotal = useMemo(
    () => recentActivity.reduce((sum, entry) => sum + entry.count, 0),
    [recentActivity]
  );

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
        <h3 className="mt-3 text-3xl font-semibold sm:text-4xl">Open statistics?</h3>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
          Login with Discord to view soundboard statistics.
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
        <p className="text-sm text-[var(--color-text-muted)]">Loading statistics...</p>
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
      <Card className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Sounds" value={String(sounds.length)} />
        <Metric label="Total Plays" value={String(totalPlayCount)} />
        <Metric label="Most Played" value={topSounds[0]?.name ?? '-'} />
        <Metric label="Newest" value={newestSounds[0]?.name ?? '-'} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4 xl:col-span-2">
          <h3 className="text-lg font-semibold">Top 10 by Plays</h3>
          {topSounds.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No sounds available.</p>
          ) : (
            <ol>
              {topSounds.map((sound, index) => (
                <li
                  key={sound.name}
                  className="py-3 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--color-border)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">
                      {index + 1}. {sound.name}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{sound.playCount} plays</span>
                  </div>
                  <div className="mt-2 h-2">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#2f6fcd,#79abff)]"
                      style={{ width: `${Math.max(4, (sound.playCount / maxPlayCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold">Upload Activity</h3>
            <span className="text-xs text-[var(--color-text-muted)]">Last {RECENT_ACTIVITY_DAYS} days</span>
          </div>
          {recentActivityTotal === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No recent upload activity.</p>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[#161d31] p-3">
              <div className="flex h-40 items-end gap-1 pb-4">
                {recentActivity.map((entry, index) => (
                  <div key={entry.dateKey} className="group relative flex h-full flex-1 items-end justify-center">
                    <div
                      className="w-full rounded-t-[5px] bg-[linear-gradient(180deg,#79abff,#2f6fcd)]"
                      style={{
                        height: `${entry.count === 0 ? 6 : Math.max(12, (entry.count / maxRecentActivityCount) * 100)}%`,
                        opacity: entry.count === 0 ? 0.35 : 1
                      }}
                      title={`${entry.fullLabel}: ${entry.count}`}
                    />
                    {index % 3 === 0 || index === recentActivity.length - 1 ? (
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-muted)]">
                        {entry.shortLabel}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-semibold">Top 10 Newest</h3>
          {newestSounds.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No sounds available.</p>
          ) : (
            <ol className="space-y-2">
              {newestSounds.map((sound, index) => (
                <li key={sound.name} className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-3 py-2">
                  <span className="truncate text-sm font-semibold">
                    {index + 1}. {sound.name}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-[var(--color-text-muted)]">
                    {new Date(sound.modifiedAt).toLocaleDateString('de-DE')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3">
      <p className="truncate text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function buildRecentActivity(
  sounds: Array<{ modifiedAt: string }>,
  days: number
): Array<{ dateKey: string; shortLabel: string; fullLabel: string; count: number }> {
  const buckets = new Map<string, { dateKey: string; shortLabel: string; fullLabel: string; count: number }>();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() - offset);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    buckets.set(dateKey, {
      dateKey,
      shortLabel: `${currentDate.getDate()}.${currentDate.getMonth() + 1}`,
      fullLabel: currentDate.toLocaleDateString('de-DE'),
      count: 0
    });
  }

  for (const sound of sounds) {
    const modifiedDate = new Date(sound.modifiedAt);
    if (Number.isNaN(modifiedDate.getTime())) {
      continue;
    }

    const year = modifiedDate.getFullYear();
    const month = String(modifiedDate.getMonth() + 1).padStart(2, '0');
    const day = String(modifiedDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const bucket = buckets.get(dateKey);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return [...buckets.values()];
}
