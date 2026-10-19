export type GatewayMethod = 'GET' | 'POST' | 'DELETE';

// The gateway's queue ids are opaque tokens; anything else (a slash, a dot segment) is refused here.
const QUEUE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * The gateway path a request to `/api/lite-gateway/<segments>` is relayed to, or null when the
 * method and path are not on the allow-list: POST reply, POST post, GET|DELETE queue/<id> and
 * POST queue/<id>/post.
 */
export function allowedGatewayPath(method: string, segments: readonly string[]): string | null {
  const [first, id, action, ...rest] = segments;
  if (rest.length > 0) return null;
  if (id === undefined) {
    return method === 'POST' && (first === 'reply' || first === 'post') ? `/${first}` : null;
  }
  if (first !== 'queue' || !QUEUE_ID.test(id)) return null;
  if (action === undefined) return method === 'GET' || method === 'DELETE' ? `/queue/${id}` : null;
  return action === 'post' && method === 'POST' ? `/queue/${id}/post` : null;
}
