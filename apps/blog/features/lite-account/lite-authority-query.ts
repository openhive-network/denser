import type { LiteAuthorityView } from '@hiveio/lite-account';
import { liteGatewayEndpoint } from './lite-endpoints.ts';

// No runtime import of @hiveio/lite-account (its `readAuthority` does the same read): the header
// and the profile read the authority, and the signing code must stay out of their bundles.

/** A failed authority step: `not_found` (no such lite account), `not_secured` (no passkey root to sign in with), `not_applied`, `unavailable`. */
export class LiteAuthorityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LiteAuthorityError';
    this.code = code;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isAuthorityView(value: unknown): value is LiteAuthorityView {
  if (!isObject(value) || typeof value.name !== 'string' || !isObject(value.roles)) return false;
  return Object.values(value.roles).every((role) => isObject(role) && Array.isArray(role.members));
}

/** The gateway's `GET /names/{name}/authority` through the app's pass-through. */
export async function fetchLiteAuthority(name: string): Promise<LiteAuthorityView> {
  let response: Response;
  try {
    response = await fetch(liteGatewayEndpoint(`/names/${encodeURIComponent(name)}/authority`), {
      cache: 'no-store'
    });
  } catch (error) {
    throw new LiteAuthorityError(
      'unavailable',
      error instanceof Error ? error.message : 'gateway unreachable'
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok && isAuthorityView(payload)) return payload;
  if (response.status === 404) throw new LiteAuthorityError('not_found', `${name} is not a lite account`);
  throw new LiteAuthorityError('unavailable', `unexpected authority answer (HTTP ${response.status})`);
}

export const liteAuthorityKey = (name: string) => ['liteAuthority', name] as const;

export const liteAuthorityQuery = (name: string) => ({
  queryKey: liteAuthorityKey(name),
  queryFn: () => fetchLiteAuthority(name),
  staleTime: 30_000,
  retry: false
});
