'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { tokenStore } from '../../lib/auth/token-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!tokenStore.getAccessToken()) {
      router.replace('/sign-in');
    }
  }, [router]);

  if (typeof window !== 'undefined' && !tokenStore.getAccessToken()) return null;
  return <>{children}</>;
}
