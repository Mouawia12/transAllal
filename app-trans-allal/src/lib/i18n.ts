import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

const LANG_KEY = 'trans_allal:lang';

export const SUPPORTED_LANGS = ['ar', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export async function getStoredLang(): Promise<SupportedLang> {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {}
  return 'ar';
}

export async function setStoredLang(lang: SupportedLang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export async function initI18n(): Promise<void> {
  const lang = await getStoredLang();
  applyRTL(lang);

  await i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: lang,
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function switchLanguage(lang: SupportedLang): Promise<void> {
  await setStoredLang(lang);
  applyRTL(lang);
  await i18n.changeLanguage(lang);
}

function applyRTL(lang: SupportedLang): void {
  const shouldBeRTL = lang === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    // App restart is required for RTL to take full effect on native.
    // In practice the user would restart the app after switching to Arabic.
  }
}

export default i18n;
