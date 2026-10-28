import type { LiteGraduationView } from '@hiveio/lite-account';
import { liteGatewayEndpoint } from './lite-endpoints.ts';

// No runtime import of @hiveio/lite-account (its `readGraduation` does the same read): the header
// and the profile read eligibility, and the signing code must stay out of their bundles.

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isGraduationView(value: unknown): value is LiteGraduationView {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.eligible === 'boolean' &&
    typeof value.rewards_hbd === 'number' &&
    (value.threshold_hbd === null || typeof value.threshold_hbd === 'number') &&
    (value.linked_account === null || typeof value.linked_account === 'string')
  );
}

/** The gateway's `GET /names/{name}/graduation` through the app's pass-through; throws on anything else. */
export async function fetchLiteGraduation(name: string): Promise<LiteGraduationView> {
  const response = await fetch(liteGatewayEndpoint(`/names/${encodeURIComponent(name)}/graduation`), {
    cache: 'no-store'
  });
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok && isGraduationView(payload)) return payload;
  throw new Error(`unexpected graduation answer for ${name} (HTTP ${response.status})`);
}

export const liteGraduationKey = (name: string) => ['liteGraduation', name] as const;

export const liteGraduationQuery = (name: string) => ({
  queryKey: liteGraduationKey(name),
  queryFn: () => fetchLiteGraduation(name),
  staleTime: 60_000,
  retry: false
});
