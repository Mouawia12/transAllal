'use client';

import { AlertTriangle, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import {
  buildSignInHref,
  getCurrentAppPath,
  readRecentAuthRedirectReason,
} from '../../lib/auth/navigation';
import { tokenStore } from '../../lib/auth/token-store';
import {
  ManagementActionButton,
  ManagementPageState,
} from '../shared/management-ui';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const authRestoreFailed = useAuthStore((state) => state.authRestoreFailed);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasAccessToken =
    typeof window !== 'undefined' ? Boolean(tokenStore.getAccessToken()) : true;

  useEffect(() => {
    if (hasHydrated && !hasAccessToken) {
      router.replace(
        buildSignInHref(
          getCurrentAppPath(),
          readRecentAuthRedirectReason() ?? 'auth-required',
        ),
      );
    }
  }, [hasAccessToken, hasHydrated, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <ManagementPageState
          icon={LoaderCircle}
          title={t('dashboard_shell.auth_check_title')}
          description={t('dashboard_shell.auth_check_description')}
        />
      </div>
    );
  }

  if (!hasAccessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <ManagementPageState
          icon={ShieldCheck}
          title={t('dashboard_shell.redirect_title')}
          description={t('dashboard_shell.redirect_description')}
        />
      </div>
    );
  }

  if (authRestoreFailed && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <ManagementPageState
            icon={AlertTriangle}
            title={t('dashboard_shell.restore_failed_title')}
            description={t('dashboard_shell.restore_failed_description')}
          />
          <div className="mt-5 flex justify-center">
            <ManagementActionButton
              size="md"
              loading={isRetrying}
              onClick={async () => {
                setIsRetrying(true);
                try {
                  await hydrate();
                } finally {
                  setIsRetrying(false);
                }
              }}
            >
              {t('dashboard_shell.restore_retry')}
            </ManagementActionButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
