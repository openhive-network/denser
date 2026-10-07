import type { Community } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { renderBody } from '@/blog/features/post-rendering/lib/render-body';
import type { RenderedCommunityDescription } from '../rendered-description-context';

const logger = getLogger('app');

/**
 * Renders a community's description on the server, as its sidebar displays it. A description that
 * fails to render is left to the client, which renders it instead.
 */
export function renderCommunityDescription({ name, description }: Community): RenderedCommunityDescription | null {
  if (!description) return null;
  try {
    return { description, html: renderBody(description, { author: '', communityDescription: true }) };
  } catch (error) {
    logger.error(error, 'Failed to render the description of %s on the server', name);
    return null;
  }
}
