import sanitize from 'sanitize-html';
import type { JsonMetadata } from '@hive/common-hiveio-packages/wax';
import remarkableStripper from './remmarkable-stripper.ts';

const MAX_SUMMARY_LENGTH = 200;

function extractBodySummary(body: string, stripQuotes = false) {
  let desc = body;

  if (stripQuotes) desc = desc.replace(/^\s*>[\s\S]*?.*\s*/g, '');
  desc = remarkableStripper.render(desc); // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
  desc = htmlDecode(desc);

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '');

  // The stripper joins blocks with a space each, and the card keeps whitespace as written.
  desc = desc.replace(/[^\S\n]+/g, ' ');

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  desc = desc.trim().split('\n')[0].trim();

  if (desc.length > MAX_SUMMARY_LENGTH) {
    desc = desc.substring(0, MAX_SUMMARY_LENGTH).trim();

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, 180)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, '…');
  }

  return desc;
}

// Some clients write a whole markdown body into the description; a card must still show a short line.
function isMalformedDescription(description: string) {
  return description.includes('\n') || description.length > MAX_SUMMARY_LENGTH;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * The text a post card shows: the metadata description or summary, whichever is first a non-empty
 * string, else the first line of the body as plain text. A multi-line or over-long description is
 * cleaned like a body, falling back to the body when nothing remains. Renders markdown with Remarkable, so client code must load this module lazily.
 */
export function getPostSummary(jsonMetadata: JsonMetadata, body: string, stripQuotes = false) {
  // json_metadata is client-written JSON, so the declared string types are not guaranteed at runtime.
  const shortDescription = nonEmptyString(jsonMetadata?.description) ?? nonEmptyString(jsonMetadata?.summary);

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes);
  }

  if (!isMalformedDescription(shortDescription)) {
    return shortDescription;
  }

  return extractBodySummary(shortDescription, stripQuotes) || extractBodySummary(body, stripQuotes);
}

const htmlDecode = (txt: string) =>
  txt.replace(/&[a-z]+;/g, (ch: string) => {
    // @ts-ignore
    const char = htmlCharMap[ch.substring(1, ch.length - 1)];
    return char ? char : ch;
  });

const htmlCharMap = {
  amp: '&',
  quot: '"',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  hearts: '♥',
  trade: '™',
  hellip: '…',
  pound: '£',
  copy: ''
};
