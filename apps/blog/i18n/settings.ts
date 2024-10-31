export const defaultLocale = 'en';
export const languages = ['en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh'];
export const defaultNS = 'common_blog';
export const cookieName = 'NEXT_LOCALE';

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
