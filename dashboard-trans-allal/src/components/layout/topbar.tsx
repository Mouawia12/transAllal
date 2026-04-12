'use client';

import { LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from './language-switcher';
import { useAuthStore } from '../../lib/auth/auth-store';

export function Topbar() {
  const t = useTranslations();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/sign-in');
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        {user && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User size={16} />
            <span>{user.firstName} {user.lastName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          <span>{t('sign_out')}</span>
        </button>
      </div>
    </header>
  );
}
