import type { TApiSetId } from '@ui/config/api-set-ids';

interface IProbeAnswer {
  answer: unknown;
  at: number;
}

// On globalThis, as the routes are (see `router.ts`): the server's engine probes in the bundle of
// the instrumentation hook, the reads that use the answers run in the pages' bundles.
const ANSWERS_KEY = Symbol.for('denser.api-sets.probe-answers');

const answers = (): Map<string, IProbeAnswer> => {
  const existing: unknown = Reflect.get(globalThis, ANSWERS_KEY);
  if (existing instanceof Map) return existing;
  const created = new Map<string, IProbeAnswer>();
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

/** The last answer an engine's probe of `node` for `setId` got, when it is at most `maxAgeMs` old. */
export const probeAnswerOf = (
  setId: TApiSetId,
  node: string,
  maxAgeMs: number,
  now = Date.now()
): { answer: unknown } | undefined => {
  const recorded = answers().get(keyOf(setId, node));
  return recorded && now - recorded.at <= maxAgeMs ? { answer: recorded.answer } : undefined;
};
