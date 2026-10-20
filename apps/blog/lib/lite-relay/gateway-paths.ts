import { isValidLiteName } from '@hiveio/lite-account';

export type GatewayMethod = 'GET' | 'POST' | 'DELETE';

const POST_ENDPOINTS = new Set(['reply', 'post', 'edit', 'delete']);

// The gateway's queue ids are opaque tokens; anything else (a slash, a dot segment) is refused here.
const QUEUE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * The gateway path a request to `/api/lite-gateway/<segments>` is relayed to, or null when the
 * method and path are not on the allow-list: POST reply, post, edit and delete, GET|DELETE
 * queue/<id>, POST queue/<id>/post and GET names/<name>/availability (a name in the lite grammar).
 */
export function allowedGatewayPath(method: string, segments: readonly string[]): string | null {
  const [first, id, action, ...rest] = segments;
  if (rest.length > 0) return null;
  if (id === undefined) {
    return method === 'POST' && POST_ENDPOINTS.has(first) ? `/${first}` : null;
  }
  if (first === 'names') {
    return method === 'GET' && action === 'availability' && isValidLiteName(id) ? `/names/${id}/availability` : null;
  }
  if (first !== 'queue' || !QUEUE_ID.test(id)) return null;
  if (action === undefined) return method === 'GET' || method === 'DELETE' ? `/queue/${id}` : null;
  return action === 'post' && method === 'POST' ? `/queue/${id}/post` : null;
}
