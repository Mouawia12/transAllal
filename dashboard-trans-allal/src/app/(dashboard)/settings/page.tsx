'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/auth/auth-store';

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const switchLang = (lang: string) => {
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.settings')}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t('language')}</h2>
        <div className="flex gap-3">
          {['ar', 'en'].map(lang => (
            <button
              key={lang}
              onClick={() => switchLang(lang)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${locale === lang ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {lang === 'ar' ? 'العربية' : 'English'}
            </button>
          ))}
        </div>
      </div>
      {user && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
          <p className="text-sm text-gray-600">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
      )}
    </div>
  );
}
