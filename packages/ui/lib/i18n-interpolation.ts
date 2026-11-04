import type { InterpolationOptions } from 'i18next';

/**
 * Interpolation for both the client and the server i18next instances, so a string renders the same
 * on both. Values are left unescaped: React and metadata escape the text themselves, and escaping here
 * too shows entities such as `&#x2F;` as text. No translation result is used as HTML
 * (`dangerouslySetInnerHTML`, `innerHTML`), so this adds no injection path.
 */
export const I18N_INTERPOLATION: InterpolationOptions = { escapeValue: false };
