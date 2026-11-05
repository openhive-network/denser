import type { LoginTokenAnswer } from './matrix-chat-sign-in.ts';

export interface GateClock {
  now(): number;
  /** Resolves after `ms`; rejects when `signal` aborts */
  sleep(ms: number, signal: AbortSignal): Promise<void>;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const SYSTEM_CLOCK: GateClock = { now: () => Date.now(), sleep };

/**
 * Keeps the login token requests of each Matrix user apart by the wait the last rate-limited
 * answer named, so that no request for that user goes out before it has passed: not a retry, a
 * sign-in started again, nor one after switching back to the user.
 */
export class LoginTokenGate {
  private readonly notBefore = new Map<string, number>();
  private readonly clock: GateClock;

  constructor(clock: GateClock = SYSTEM_CLOCK) {
    this.clock = clock;
  }

  /**
   * Asks `ask` for a login token for `userId` once the user's last rate limit and `heldUntil` (a
   * time of `clock.now()`) have passed, and remembers the wait of a rate-limited answer. Rejects,
   * without asking, when `signal` aborts first.
   */
  async request(
    userId: string,
    ask: () => Promise<LoginTokenAnswer>,
    signal: AbortSignal,
    heldUntil = 0
  ): Promise<LoginTokenAnswer> {
    signal.throwIfAborted();
    const until = Math.max(this.notBefore.get(userId) ?? 0, heldUntil);
    const waitMs = until - this.clock.now();
    if (waitMs > 0) await this.clock.sleep(waitMs, signal);
    signal.throwIfAborted();
    const answer = await ask();
    if (answer.kind === 'rate-limited') this.notBefore.set(userId, this.clock.now() + answer.retryAfterMs);
    else this.notBefore.delete(userId);
    return answer;
  }
}
