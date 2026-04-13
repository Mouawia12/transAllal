import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = new Set(["ar", "en"]);

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const segmentLocale = await requestLocale;
  const requestedLocale = cookieLocale ?? segmentLocale ?? "ar";
  const locale = SUPPORTED_LOCALES.has(requestedLocale)
    ? requestedLocale
    : "ar";

  const messages = await import(`../../messages/${locale}/common.json`).then(
    (m) => m.default,
  );
  return { locale, messages };
});
