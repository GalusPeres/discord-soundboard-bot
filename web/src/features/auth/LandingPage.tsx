import { Navigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DISCORD_LOGIN_URL } from '@/features/auth/authApi';
import { useAuth } from '@/features/auth/AuthContext';

export function LandingPage() {
  const { session, loading } = useAuth();

  if (!loading && session.authenticated) {
    return <Navigate to="/app/soundboard" replace />;
  }

  return (
    <div className="grid h-screen place-items-center bg-[var(--color-bg)] px-4">
      <Card className="w-full max-w-md space-y-5 border-[#344064] bg-[#1b2133] p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[#2f6fcd] text-white">
            <Volume2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Discord Soundboard</p>
            <p className="text-xs text-[var(--color-text-muted)]">Login to continue</p>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={() => (window.location.href = DISCORD_LOGIN_URL)}>
          Login with Discord
        </Button>
      </Card>
    </div>
  );
}
