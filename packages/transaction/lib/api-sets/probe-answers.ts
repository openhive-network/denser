import type { TApiSetId } from '@ui/config/api-set-ids';

/** What a probe got: the node's answer, or `failed` when it could not be asked (transport, timeout). */
export type TProbeAnswer = { answer: unknown } | { failed: true };

type TRecordedAnswer = TProbeAnswer & { at: number };

// On globalThis, as the routes are (see `router.ts`): the server's engine probes in the bundle of
// the instrumentation hook, the reads that use the answers run in the pages' bundles.
const ANSWERS_KEY = Symbol.for('denser.api-sets.probe-answers');

const answers = (): Map<string, TRecordedAnswer> => {
  const existing: unknown = Reflect.get(globalThis, ANSWERS_KEY);
  if (existing instanceof Map) return existing;
  const created = new Map<string, TRecordedAnswer>();
  Reflect.set(globalThis, ANSWERS_KEY, created);
  return created;
};

const keyOf = (setId: TApiSetId, node: string): string => `${setId} ${node}`;

/**
 * Keeps what an engine's probe of `node` for `setId` answered (`null`: the node does not serve the
 * set), for code that needs the answer itself, not only the engine's verdict (`lite.get_info`).
 */
export const recordProbeAnswer = (setId: TApiSetId, node: string, answer: unknown, at = Date.now()): void => {
  answers().set(keyOf(setId, node), { answer, at });
};

/**
 * Keeps that an engine's probe of `node` for `setId` could not ask it (a transport failure or
 * timeout), which says nothing about whether the node serves the set.
 */
export const recordProbeFailure = (setId: TApiSetId, node: string, at = Date.now()): void => {
  answers().set(keyOf(setId, node), { failed: true, at });
};

/** The last outcome of an engine's probe of `node` for `setId`, when it is at most `maxAgeMs` old. */
export const probeAnswerOf = (
  setId: TApiSetId,
  node: string,
  maxAgeMs: number,
  now = Date.now()
): TProbeAnswer | undefined => {
  const recorded = answers().get(keyOf(setId, node));
  if (!recorded || now - recorded.at > maxAgeMs) return undefined;
  return 'answer' in recorded ? { answer: recorded.answer } : { failed: true };
};
