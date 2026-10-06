import type { Entry } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import type { RenderedBodies } from '../rendered-bodies-context';
import { renderBody } from './render-body';

const logger = getLogger('app');

const getEntryKey = ({ author, permlink }: Entry) => `${author}/${permlink}`;

/**
 * Renders the post and every reply of its discussion on the server, as the post page displays
 * them: only a top-level post is rendered as the page's main post. A body that fails to render is
 * left out and rendered by the client instead.
 */
export function renderDiscussionBodies(post: Entry | null, discussion: Record<string, Entry> | null): RenderedBodies {
  const entries = new Map(Object.values(discussion ?? {}).map((entry) => [getEntryKey(entry), entry]));
  if (post) entries.set(getEntryKey(post), post);
  const rendered: RenderedBodies = {};
  for (const [key, { author, permlink, body, depth }] of entries) {
    if (!body) continue;
    const mainPost = depth === 0;
    try {
      rendered[key] = { body, mainPost, html: renderBody(body, { author, permlink, mainPost }) };
    } catch (error) {
      logger.error(error, 'Failed to render the body of %s on the server', key);
    }
  }
  return rendered;
}
