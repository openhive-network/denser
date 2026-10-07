import { CONTENT_ALG, DEFAULT_LITE_APP_IDS, type LiteAppIds } from '@hive/lite-account';

export type LiteAttribution = { attester: string; alg: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The lite-account claim carried by a bridged comment's json_metadata (the gate's
 * disavowal marker, keyed by the posts app id of the namespace this site reads). This is
 * the gate's *claim*, not proof: proof is the attester's signed attest_post, which the
 * lite_posts app verifies. Until the hivemind lite wrapper is served, the UI shows the
 * claim as "unverified".
 */
export function liteAttribution(jsonMetadata: unknown, apps: LiteAppIds = DEFAULT_LITE_APP_IDS): LiteAttribution | undefined {
  if (!isRecord(jsonMetadata)) return undefined;
  const marker = jsonMetadata[apps.posts];
  if (!isRecord(marker)) return undefined;
  const { attester, alg } = marker;
  if (typeof attester !== 'string' || attester.length === 0) return undefined;
  return { attester, alg: typeof alg === 'string' ? alg : CONTENT_ALG };
}
