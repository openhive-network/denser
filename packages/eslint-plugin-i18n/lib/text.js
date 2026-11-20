/**
 * What counts as user-facing text: a string with a letter of any script that is not only names every
 * locale keeps, a bare URL, a colour or (where `allowKeys`) a dotted translation key handed on to a
 * later t().
 */

const LETTER = /\p{L}/u;
const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u;
const BARE_URL = /^\s*https?:\S*\s*$/;
const HEX_COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TRANSLATION_KEY = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_-]+)+$/;
// A template part is text when a word stands beside a space; key fragments like `login_form.title_${type}`
// have none. Scripts written without spaces (CJK) are text whatever stands beside them.
const TEMPLATE_WORD = /\p{L}\S*\s|\s\S*\p{L}/u;
// Prose in an attribute that does not name text: a capitalised word followed by another word.
const PROSE = /^\s*\p{Lu}\p{Ll}*[\s,]+\p{L}/u;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Text tests for a set of untranslated names (longest first, so "Hive Keychain" wins over "Hive").
 * @param {string[]} untranslatedNames matched in any case: an "nsfw" tag is one
 */
function createTextMatcher(untranslatedNames) {
  const names = [...untranslatedNames].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const namesPattern = names.length > 0 ? new RegExp(names.join('|'), 'giu') : null;
  const withoutNames = (value) => (namesPattern ? value.replace(namesPattern, ' ') : value);
  const hasOwnWords = (value) => LETTER.test(withoutNames(value));

  /** A whole string shown to the user. */
  const isText = (value, { allowKeys = false } = {}) =>
    typeof value === 'string' &&
    hasOwnWords(value) &&
    !BARE_URL.test(value) &&
    !HEX_COLOR.test(value) &&
    !(allowKeys && TRANSLATION_KEY.test(value));

  /** A part of a template with expressions, e.g. the `Total ` of `Total ${n}`. */
  const isTemplateText = (raw) =>
    hasOwnWords(raw) && (TEMPLATE_WORD.test(withoutNames(raw)) || NON_LATIN_LETTER.test(withoutNames(raw)));

  /** A string in an attribute that does not name text (`content`, `data-x`): prose, or a non-Latin script. */
  const isProse = (value) =>
    isText(value, { allowKeys: true }) && (PROSE.test(value) || NON_LATIN_LETTER.test(withoutNames(value)));

  return { isText, isTemplateText, isProse };
}

module.exports = { createTextMatcher };
