'use client';

import { Globe2, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  ManagementActionButton,
  ManagementDetailTile,
  ManagementHero,
  ManagementInlineState,
  ManagementPanel,
  ManagementStatCard,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { useAuthStore } from '../../../lib/auth/auth-store';

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isPending, startTransition] = useTransition();

  const switchLang = (lang: string) => {
    if (lang === locale) {
      return;
    }

    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('settings_page.eyebrow')}
        title={t('nav.settings')}
        description={t('settings_page.description')}
        className="bg-[linear-gradient(135deg,#121826_0%,#21364a_46%,#3e5b75_100%)]"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ManagementStatCard
            icon={Globe2}
            label={t('settings_page.language_title')}
            value={locale === 'ar' ? 'AR' : 'EN'}
            note={t('settings_page.language_note')}
          />
          <ManagementStatCard
            icon={ShieldCheck}
            label={t('dashboard_shell.secure_session')}
            value={t('settings_page.session_value')}
            note={t('settings_page.session_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
          <ManagementStatCard
            icon={UserCircle2}
            label={t('settings_page.profile_title')}
            value={user ? `${user.firstName} ${user.lastName}` : '—'}
            note={t('settings_page.profile_note')}
            toneClassName="bg-sky-400/18 text-sky-50"
          />
        </div>
      </ManagementHero>

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ManagementPanel
          eyebrow={t('language')}
          title={t('settings_page.language_title')}
          description={t('settings_page.language_description')}
        >
          <div className="flex flex-wrap gap-3">
            {['ar', 'en'].map((lang) => (
              <ManagementActionButton
                key={lang}
                onClick={() => switchLang(lang)}
                tone={locale === lang ? 'solid' : 'neutral'}
                size="md"
                loading={isPending && locale !== lang}
                disabled={isPending || locale === lang}
                aria-pressed={locale === lang}
                lang={lang}
              >
                {lang === 'ar' ? 'العربية' : 'English'}
              </ManagementActionButton>
            ))}
          </div>
        </ManagementPanel>

        <ManagementPanel
          eyebrow={t('settings_page.profile_title')}
          title={t('settings_page.profile_title')}
          description={t('settings_page.profile_description')}
          headerSlot={
            user ? (
              <ToneBadge
                label={t(`roles.${user.role}` as Parameters<typeof t>[0])}
                toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
              />
            ) : undefined
          }
        >
          {user ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ManagementDetailTile
                label={t('name')}
                value={`${user.firstName} ${user.lastName}`}
              />
              <ManagementDetailTile label={t('email')} value={user.email} />
            </div>
          ) : (
            <ManagementInlineState
              title={t('ui_state.empty_title')}
              description={t('ui_state.empty_description')}
            />
          )}
        </ManagementPanel>
      </div>
    </div>
  );
}
