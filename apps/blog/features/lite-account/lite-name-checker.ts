import { generateLiteName, isValidLiteName } from '@hiveio/lite-account';
import { availabilityState, type LiteNameAvailability, type LiteNameState } from './lite-name-availability.ts';

export const NAME_CHECK_DEBOUNCE_MS = 300;
export const MAX_SUGGEST_ATTEMPTS = 5;

type AvailabilityCheck = (name: string, signal: AbortSignal) => Promise<LiteNameAvailability>;

type Options = { delayMs?: number; generate?: () => string; maxAttempts?: number };

export type LiteNameChecker = {
  /** The user typed `name`: reports its state now (`invalid`, a known answer, or `checking`) and the gateway's after the debounce. */
  update: (name: string) => void;
  /** Generates names until one is available (or `maxAttempts` are spent, or the gateway fails); undefined when superseded. */
  suggest: (first?: string) => Promise<string | undefined>;
  /** Records a state learnt elsewhere (a name the gateway refused at posting time). */
  remember: (name: string, state: LiteNameState) => void;
  /** Drops the pending check; its answer is never reported. */
  cancel: () => void;
};

/**
 * The name dialog's availability checks. Every `update`, `suggest` and `cancel` aborts the request
 * before it, so an answer is only ever reported for the latest name. Answers are remembered per
 * name; a failed check is not.
 */
export function createLiteNameChecker(
  check: AvailabilityCheck,
  onState: (name: string, state: LiteNameState) => void,
  { delayMs = NAME_CHECK_DEBOUNCE_MS, generate = generateLiteName, maxAttempts = MAX_SUGGEST_ATTEMPTS }: Options = {}
): LiteNameChecker {
  const known = new Map<string, LiteNameState>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const restart = (): AbortSignal => {
    clearTimeout(timer);
    controller?.abort();
    controller = new AbortController();
    return controller.signal;
  };

  const ask = async (name: string, signal: AbortSignal): Promise<LiteNameState> => {
    if (!isValidLiteName(name)) return 'invalid';
    const cached = known.get(name);
    if (cached) return cached;
    try {
      const state = availabilityState(await check(name, signal));
      known.set(name, state);
      return state;
    } catch {
      return 'check_failed'; // shown to the user; an aborted check is never reported
    }
  };

  return {
    update(name) {
      const signal = restart();
      const immediate = isValidLiteName(name) ? known.get(name) : 'invalid';
      if (immediate) {
        onState(name, immediate);
        return;
      }
      onState(name, 'checking');
      timer = setTimeout(() => {
        void ask(name, signal).then((state) => {
          if (!signal.aborted) onState(name, state);
        });
      }, delayMs);
    },
    async suggest(first) {
      const signal = restart();
      let name = first ?? generate();
      for (let attempt = 1; ; attempt++) {
        const state = await ask(name, signal);
        if (signal.aborted) return undefined;
        if (state === 'available' || state === 'check_failed' || attempt >= maxAttempts) {
          onState(name, state);
          return name;
        }
        name = generate();
      }
    },
    remember(name, state) {
      known.set(name, state);
    },
    cancel() {
      restart();
    }
  };
}
