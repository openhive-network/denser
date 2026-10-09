import { Metadata } from 'next';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';

/**
 * Canonical link of a profile page (`/@user`) or one of its tabs (`/@user/<tab>`),
 * whichever form (`@user` or `%40user`) the URL used. Relative: the root layout's
 * metadataBase resolves it against the configured site domain. Undefined when the
 * route param is not an account.
 */
export function profileCanonical(param: string, tab?: string): Metadata['alternates'] {
  const username = extractUsernameFromParam(param);
  if (!username) return undefined;
  return { canonical: tab ? `/@${username}/${tab}` : `/@${username}` };
}
