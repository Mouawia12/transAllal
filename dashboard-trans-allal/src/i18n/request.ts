import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const segmentLocale = await requestLocale;
  const locale = cookieLocale ?? segmentLocale ?? 'ar';

  const messages = await import(`../../messages/${locale}/common.json`).then(m => m.default);
  return { locale, messages };
});
