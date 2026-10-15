export const defaultLocale = 'en';
export const languages = ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh'];
export const defaultNS = 'common_blog';
export const cookieName = 'NEXT_LOCALE';

/**
 * The language the blog renders for a `NEXT_LOCALE` cookie value: the value when the blog has
 * translations for it, else `defaultLocale`. The cookie is shared with the other apps of the origin,
 * so it can name a language only they support.
 */
export function resolveLocale(cookieValue: string | undefined): string {
  return cookieValue && languages.includes(cookieValue) ? cookieValue : defaultLocale;
}

export function getOptions(lng = defaultLocale, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: languages,
    fallbackLng: defaultLocale,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns
  };
}
