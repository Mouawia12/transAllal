'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { tokenStore } from '../../lib/auth/token-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !tokenStore.getAccessToken()) {
      router.replace('/sign-in');
    }
  }, [hasHydrated, router]);

  if (!hasHydrated) return null;
  if (typeof window !== 'undefined' && !tokenStore.getAccessToken()) return null;
  return <>{children}</>;
}
