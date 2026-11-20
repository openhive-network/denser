import env from '@beam-australia/react-env';

/**
 * The pseudo-locale: every text of `en`, accented, about 40 % longer and wrapped in `[` `]`, so a page
 * rendered in it shows at a glance which texts bypass the translations and which do not fit once
 * translated. A test and development aid, never offered to users: the apps accept it only in
 * `next dev` or with `REACT_APP_PSEUDO_LOCALE=true` (the fixture servers).
 */
export const PSEUDO_LOCALE = 'xx';
const PSEUDO_MARKER_START = '[';
const PSEUDO_MARKER_END = ']';
/** What pseudo-localization adds to a text's length, padding included. */
const EXPANSION = 0.4;
const PADDING_CHUNK = ' ···';

const PLAIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ACCENTED = 'åƀçðéƒĝĥîĵķļɱñöþǫŕşţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŞŢÛṼŴẊÝŽ';
const ACCENT = new Map([...PLAIN].map((letter, index) => [letter, [...ACCENTED][index]]));
/** The characters that only pseudo-localized text has: a text with none of them bypassed the translations. */
export const PSEUDO_CHARACTERS = `${PSEUDO_MARKER_START}${PSEUDO_MARKER_END}${ACCENTED}${PADDING_CHUNK.trim()}`;

/**
 * The parts of a text that are not words to translate: i18next interpolations (`{{count}}`), nesting
 * (`$t(key)`), `<Trans>` and HTML tags, entities and URLs. They are kept as they are.
 */
const PROTECTED = /(\{\{[^}]*\}\}|\$t\([^)]*\)|<[^<>]*>|&[#\w]+;|https?:\/\/\S+)/;

export function pseudoLocaleEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || env('PSEUDO_LOCALE') === 'true';
}

/** `languages` with the pseudo-locale appended where it is enabled. */
export function withPseudoLocale(languages: string[]): string[] {
  return pseudoLocaleEnabled() ? [...languages, PSEUDO_LOCALE] : languages;
}

function padding(length: number): string {
  return PADDING_CHUNK.repeat(Math.ceil(length / PADDING_CHUNK.length)).slice(0, length);
}

/** One text in the pseudo-locale; an empty text stays empty. */
export function pseudoLocalize(text: string): string {
  if (!text) return text;
  let wordLength = 0;
  const accented = text
    .split(PROTECTED)
    .map((part, index) => {
      // `split` with a capturing group puts the protected parts at odd indexes
      if (index % 2 === 1) return part;
      wordLength += part.length;
      return [...part].map((char) => ACCENT.get(char) ?? char).join('');
    })
    .join('');
  return `${PSEUDO_MARKER_START}${accented}${padding(Math.ceil(wordLength * EXPANSION))}${PSEUDO_MARKER_END}`;
}

/** A locale file's content in the pseudo-locale: the same keys (plural forms included), every string localized. */
export function pseudoLocalizeResources(resources: unknown): unknown {
  if (typeof resources === 'string') return pseudoLocalize(resources);
  if (Array.isArray(resources)) return resources.map(pseudoLocalizeResources);
  if (resources && typeof resources === 'object') {
    return Object.fromEntries(
      Object.entries(resources).map(([key, value]) => [key, pseudoLocalizeResources(value)])
    );
  }
  return resources;
}

type NamespaceLoader = (language: string, namespace: string) => Promise<unknown>;

/** `loadNamespace` that answers the pseudo-locale with the pseudo-localized `en` namespace. */
export function withPseudoLocaleLoader(loadNamespace: NamespaceLoader, sourceLocale = 'en'): NamespaceLoader {
  return async (language, namespace) => {
    if (language !== PSEUDO_LOCALE) return loadNamespace(language, namespace);
    const loaded = await loadNamespace(sourceLocale, namespace);
    // A JSON module import gives `{ default: resources }`
    const resources = loaded && typeof loaded === 'object' && 'default' in loaded ? loaded.default : loaded;
    return pseudoLocalizeResources(resources);
  };
}
