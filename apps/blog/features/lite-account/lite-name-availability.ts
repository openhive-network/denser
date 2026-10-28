import { liteGatewayEndpoint } from './lite-endpoints.ts';
import { relayErrorCode } from './lite-root-post.ts';

/** The gateway's `GET /names/{name}/availability` answer (hive/lite_gateway docs/api.md). */
export type LiteNameAvailability = {
  name: string;
  available: boolean;
  lite_grammar_ok: boolean;
  l1_grammar_ok: boolean;
  lite_taken: boolean;
  l1_taken: boolean;
};

/**
 * What the name dialog says about a name: `invalid` fails the lite grammar, `invalid_l1` the Hive
 * one; `taken_lite` / `taken_l1` name the registry that holds it, `taken` is a name the gateway
 * refused at posting time; `check_failed` is a gateway that could not be asked.
 */
export type LiteNameState =
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken'
  | 'taken_lite'
  | 'taken_l1'
  | 'invalid_l1'
  | 'check_failed';

const FLAGS = ['available', 'lite_grammar_ok', 'l1_grammar_ok', 'lite_taken', 'l1_taken'] as const;

function isAvailability(value: unknown): value is LiteNameAvailability {
  if (typeof value !== 'object' || value === null) return false;
  const record: Record<string, unknown> = { ...value };
  return typeof record.name === 'string' && FLAGS.every((flag) => typeof record[flag] === 'boolean');
}

/**
 * Asks the gateway, through the app's allow-listed pass-through, whether `name` can be taken.
 * Throws when the gateway is unreachable or answers anything but an availability record.
 */
export async function checkLiteNameAvailability(name: string, signal?: AbortSignal): Promise<LiteNameAvailability> {
  const url = liteGatewayEndpoint(`/names/${encodeURIComponent(name)}/availability`);
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isAvailability(payload)) {
    throw new Error(`lite name availability check failed (HTTP ${response.status})`);
  }
  return payload;
}

export function availabilityState(answer: LiteNameAvailability): LiteNameState {
  if (!answer.lite_grammar_ok) return 'invalid';
  if (!answer.l1_grammar_ok) return 'invalid_l1';
  if (answer.lite_taken) return 'taken_lite';
  if (answer.l1_taken) return 'taken_l1';
  return answer.available ? 'available' : 'taken';
}

/**
 * What the graduation dialog says about `answer` as the Hive account `ownName` graduates to: only
 * the Hive registry counts, and the lite registry only for another lite account's name (the
 * gateway keeps that for its own graduation); `ownName` itself is free unless a Hive account has it.
 */
export function graduationNameState(answer: LiteNameAvailability, ownName: string): LiteNameState {
  if (!answer.l1_grammar_ok) return 'invalid_l1';
  if (answer.l1_taken) return 'taken_l1';
  if (answer.lite_taken && answer.name !== ownName) return 'taken_lite';
  return 'available';
}

/** Whether a name in `state` may be confirmed: an available one, or one the gateway could not check (it refuses a taken name at posting time). */
export const canConfirmLiteName = (state: LiteNameState): boolean => state === 'available' || state === 'check_failed';

/** Whether a failed reply or post was refused because its new lite account's name is taken. */
export const isLiteNameTaken = (error: unknown): boolean => relayErrorCode(error)?.code === 'name_taken';
