import { cookies } from 'next/headers';
import { createInstance, type InitOptions, type TFunction } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { I18N_INTERPOLATION } from '@ui/lib/i18n-interpolation';

/** The app's `i18n/settings` module. */
interface I18nSettings {
  languages: string[];
  defaultLocale: string;
  cookieName: string;
  getOptions: (lng: string, ns: string) => InitOptions;
}

/** Loads one namespace of one language; the import has to live in the app that owns the locale files. */
type NamespaceLoader = (language: string, namespace: string) => Promise<unknown>;

/**
 * Returns the app's `getTranslation` for server code (server components, `generateMetadata`), where the
 * client's `useTranslation` hook cannot run. The language is the request's language cookie, resolved
 * against `languages` as the root layout does.
 */
export function createI18nServer(
  { languages, defaultLocale, cookieName, getOptions }: I18nSettings,
  loadNamespace: NamespaceLoader
) {
  // Locale files do not change at runtime, so one initialized instance per language and namespace
  // serves every request.
  const instances = new Map<string, Promise<TFunction>>();

  function getFixedT(lng: string, ns: string): Promise<TFunction> {
    const cacheKey = `${lng}:${ns}`;
    let pending = instances.get(cacheKey);
    if (!pending) {
      const instance = createInstance();
      pending = instance
        .use(resourcesToBackend(loadNamespace))
        .init({
          ...getOptions(lng, ns),
          interpolation: I18N_INTERPOLATION
        })
        .then(() => instance.getFixedT(lng, ns));
      instances.set(cacheKey, pending);
    }
    return pending;
  }

  async function getTranslation(ns: string): Promise<{ t: TFunction; locale: string }> {
    const cookieValue = (await cookies()).get(cookieName)?.value;
    const locale = cookieValue && languages.includes(cookieValue) ? cookieValue : defaultLocale;
    return { t: await getFixedT(locale, ns), locale };
  }

  return { getTranslation };
}
