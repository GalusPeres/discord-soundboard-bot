import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ToastHost } from '@/components/ui/Toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastHost />
    </AuthProvider>
  );
}
