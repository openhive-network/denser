/** A run of a message's plain text, a link when `href` is set */
export interface TextSegment {
  text: string;
  href?: string;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"]+/gi;
/** Punctuation that ends a sentence around a link rather than belonging to it */
const TRAILING_PUNCTUATION = /[.,;:!?'")\]}]+$/;

/** Splits plain text into text and the http(s) links in it, which are the only ones made links. */
export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    const start = match.index ?? last;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: url, href: url });
    last = start + url.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
