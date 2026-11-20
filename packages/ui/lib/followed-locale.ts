/** A language i18next switched the browser's texts to, while the server had rendered `serverLocale`. */
export interface I18nLanguageSwitch {
  serverLocale: string;
  language: string;
}

/**
 * The locale to format in: the language of `languageSwitch` when i18next switched to it during the
 * server's render of `serverLocale`, else `serverLocale`. A newer server render, of another locale,
 * supersedes a switch made during the one before.
 */
export function followedLocale(serverLocale: string, languageSwitch: I18nLanguageSwitch | null): string {
  return languageSwitch?.serverLocale === serverLocale ? languageSwitch.language : serverLocale;
}
