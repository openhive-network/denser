import type { Entry } from '@hive/common-hiveio-packages/wax';
import { HighlightBudget } from '@hive/renderer';
import { getLogger } from '@ui/lib/logging';
import type { RenderedBodies } from '../rendered-bodies-context';
import { renderBody } from './render-body';
import { withSyntaxHighlightBudget } from './renderer';

const logger = getLogger('app');

/**
 * How much code one page render highlights on the server. Each block is at most 16 KiB (the
 * renderer's own limit), so a page highlights at most 40 blocks, or 128 KiB of code in total;
 * the rest is sent plain and highlighted by the browser.
 */
const MAX_HIGHLIGHTED_BLOCKS_PER_PAGE = 40;
const MAX_HIGHLIGHTED_UTF8_BYTES_PER_PAGE = 128 * 1024;

const getEntryKey = ({ author, permlink }: Entry) => `${author}/${permlink}`;

/** The post first, so it takes from the highlight budget before its replies. */
function orderedEntries(post: Entry | null, discussion: Record<string, Entry> | null): Map<string, Entry> {
  const entries = new Map<string, Entry>(post ? [[getEntryKey(post), post]] : []);
  for (const entry of Object.values(discussion ?? {})) {
    const key = getEntryKey(entry);
    if (!entries.has(key)) entries.set(key, entry);
  }
  return entries;
}

/**
 * Renders the post and the given replies of its discussion on the server, as the post page displays
 * them: only a top-level post is rendered as the page's main post. A reply not in `replies`, or a
 * body that fails to render, is left out and rendered by the client instead. Code is highlighted
 * within one budget for the whole page; a body with blocks left plain by it is marked
 * `highlightDeferred`.
 */
export function renderDiscussionBodies(post: Entry | null, replies: Record<string, Entry> | null): RenderedBodies {
  const budget = new HighlightBudget(MAX_HIGHLIGHTED_BLOCKS_PER_PAGE, MAX_HIGHLIGHTED_UTF8_BYTES_PER_PAGE);
  const rendered: RenderedBodies = {};
  for (const [key, { author, permlink, body, depth }] of orderedEntries(post, replies)) {
    if (!body) continue;
    const mainPost = depth === 0;
    const refusedBefore = budget.refusedBlocks;
    try {
      const html = withSyntaxHighlightBudget(budget, () => renderBody(body, { author, permlink, mainPost }));
      rendered[key] = { body, mainPost, html, highlightDeferred: budget.refusedBlocks > refusedBefore };
    } catch (error) {
      logger.error(error, 'Failed to render the body of %s on the server', key);
    }
  }
  return rendered;
}
