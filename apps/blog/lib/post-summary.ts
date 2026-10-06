import sanitize from 'sanitize-html';
import { JsonMetadata } from '@hive/common-hiveio-packages/wax';
import remarkableStripper from './remmarkable-stripper';

function extractBodySummary(body: string, stripQuotes = false) {
  let desc = body;

  if (stripQuotes) desc = desc.replace(/^\s*>[\s\S]*?.*\s*/g, '');
  desc = remarkableStripper.render(desc); // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
  desc = htmlDecode(desc);

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '');

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  // eslint-disable-next-line prefer-destructuring
  desc = desc.trim().split('\n')[0];

  if (desc.length > 200) {
    desc = desc.substring(0, 200).trim();

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, 180)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, '…');
  }

  return desc;
}

/**
 * The text a post card shows: the metadata description or summary, else the first line of the body
 * as plain text. Renders the body with Remarkable, so client code must load this module lazily.
 */
export function getPostSummary(jsonMetadata: JsonMetadata, body: string, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description ? jsonMetadata?.description : jsonMetadata?.summary;

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes);
  }

  return shortDescription;
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
