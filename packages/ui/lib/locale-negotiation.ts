/**
 * The first of `preferred` (language tags such as `pl-PL`, most wanted first) whose primary subtag is
 * one of `supported`, or null when none is. Matching ignores case and region: `zh-TW` picks `zh`.
 */
export function pickSupportedLocale(preferred: readonly string[], supported: readonly string[]): string | null {
  for (const tag of preferred) {
    const primary = tag.trim().toLowerCase().split('-')[0];
    if (primary && supported.includes(primary)) return primary;
  }
  return null;
}

/**
 * The language tags of an `Accept-Language` header, most wanted first: ordered by `q` (1 when absent),
 * the header's order among equal weights, without `*` and the ranges it refuses (`q=0`).
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((range, index) => {
      const [tag = '', ...params] = range.split(';').map((part) => part.trim());
      const qParam = params.find((param) => /^q=/i.test(param));
      const q = qParam === undefined ? 1 : Number(qParam.slice(2));
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .filter(({ tag, q }) => tag !== '' && tag !== '*' && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);
}

/** The browser's languages, most wanted first; empty outside a browser. */
export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}
