import type { i18n, InterpolationOptions } from 'i18next';

/**
 * Interpolation for both the client and the server i18next instances, so a string renders the same
 * on both. Values are left unescaped: React and metadata escape the text themselves, and escaping here
 * too shows entities such as `&#x2F;` as text. No translation result is used as HTML
 * (`dangerouslySetInnerHTML`, `innerHTML`), so this adds no injection path.
 */
export const I18N_INTERPOLATION: InterpolationOptions = { escapeValue: false };

/**
 * Registers the formatters translations may use on an initialized instance (client and server alike):
 * `{{value, capitalize}}` upper-cases the first letter, so a locale can write a key type as a name
 * ("klucz Active") where English keeps the word lowercase.
 */
export function addI18nFormatters(instance: i18n): void {
  instance.services.formatter?.add('capitalize', (value: unknown) => {
    const text = String(value);
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
}
