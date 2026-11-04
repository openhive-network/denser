/** A run of a message's plain text, a link when `href` is set */
export interface TextSegment {
  text: string;
  href?: string;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"]+/gi;
/** Punctuation that ends a sentence around a link rather than belonging to it */
const TRAILING_PUNCTUATION = new Set('.,;:!?\'")]}');

/** A scan from the end, since a `[...]+$` regex retries from each character of a run that does not end the string */
function trimTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(url[end - 1])) end--;
  return url.slice(0, end);
}

/** Splits plain text into text and the http(s) links in it, which are the only ones made links. */
export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimTrailingPunctuation(match[0]);
    const start = match.index ?? last;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: url, href: url });
    last = start + url.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
