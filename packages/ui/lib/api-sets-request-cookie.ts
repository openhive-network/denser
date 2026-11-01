import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { API_SETS_COOKIE } from '@ui/config/api-set-ids';

/**
 * The API sets cookie (the user's per-set node choices) of the request being served, or undefined
 * outside a request, e.g. while a server cache refreshes in the background: such a read is routed
 * for no user in particular.
 */
export async function readApiSetsCookie(): Promise<string | undefined> {
  try {
    return (await cookies()).get(API_SETS_COOKIE)?.value;
  } catch (error) {
    // Next.js's own control-flow errors (dynamic rendering, redirects) must reach it.
    unstable_rethrow(error);
    return undefined;
  }
}
