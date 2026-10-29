// A markdown image or link, or an HTML tag, the cut left unclosed at the end of a body.
const UNFINISHED_MARKUP = /(?:!?\[[^\]\n]*(?:\]\([^)\s]*)?|<[^>\n]*)$/;

/**
 * `body` without the markdown image or link (`![x`, `![x](`, `[x](https://…`) or HTML tag
 * (`<img src="…`) a server-side cut at `cutLength` characters left unclosed at its end. Left in,
 * such a fragment shows as text in a card summary. A body shorter than `cutLength` ends where its
 * author ended it and is returned as is.
 */
export function dropUnfinishedMarkup(body: string, cutLength: number): string {
  if (body.length < cutLength) return body;
  return body.replace(UNFINISHED_MARKUP, '');
}
