import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/** How long a node that failed is skipped before one call is let through to probe it. */
export const NODE_COOLDOWN_MS = 30_000;

export interface INodeHealthOptions {
  cooldownMs?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
  /** Another record whose down nodes are skipped as well. It is only read, never written. */
  consults?: NodeHealth;
}

/** `healthy`: no failure on record. `probe`: the cooldown has passed and this caller tests the node. */
export type TNodeAdmission = 'healthy' | 'probe';

/**
 * Circuit breaker over API nodes, keyed by what of a node a failure says is down: one API family of
 * it (`<node>/<family>`, e.g. `https://api.example.com/core`), one REST API of it
 * (`https://api.example.com/balance-api`) or the whole node (see `nodeUnreachableKey`). It holds no
 * request data, only when each failed key may be tried again. A key marked down is skipped until
 * its cooldown ends; the first caller after that is admitted as a probe while everyone else keeps
 * skipping it, and the probe's outcome either clears the key or restarts its cooldown. A record that
 * `consults` another also skips every key down there, without ever writing to it.
 */
export class NodeHealth {
  private readonly downUntil = new Map<string, number>();
  private readonly lastUpAt = new Map<string, number>();
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly consulted?: NodeHealth;

  constructor({ cooldownMs = NODE_COOLDOWN_MS, now = Date.now, consults }: INodeHealthOptions = {}) {
    this.cooldownMs = cooldownMs;
    this.now = now;
    this.consulted = consults;
  }

  /** Whether `node` is inside its cooldown here or in the consulted record. Does not claim a probe. */
  isDown(node: string): boolean {
    return this.isOwnDown(node) || (this.consulted?.isDown(node) ?? false);
  }

  /** Admits a call to `node`, claiming the probe when its cooldown has passed; `undefined` = skip it. */
  admit(node: string): TNodeAdmission | undefined {
    if (this.consulted?.isDown(node)) return undefined;
    if (!this.downUntil.has(node)) return 'healthy';
    if (this.isOwnDown(node)) return undefined;
    this.downUntil.set(node, this.now() + this.cooldownMs);
    return 'probe';
  }

  markDown(node: string): void {
    if (!this.downUntil.has(node)) {
      logger.warn('API node %s marked down, skipping it for %d ms', node, this.cooldownMs);
    }
    this.downUntil.set(node, this.now() + this.cooldownMs);
  }

  markUp(node: string): void {
    this.lastUpAt.set(node, this.now());
    if (this.downUntil.delete(node)) logger.info('API node %s recovered', node);
  }

  private isOwnDown(node: string): boolean {
    const until = this.downUntil.get(node);
    return until !== undefined && this.now() < until;
  }

  /** `nodes` with the most recently healthy first; nodes never seen healthy keep their order, last. */
  byRecentHealth(nodes: readonly string[]): string[] {
    const lastUp = (node: string) => this.lastUpAt.get(node) ?? Number.NEGATIVE_INFINITY;
    return [...nodes].sort((a, b) => Number(lastUp(b) > lastUp(a)) - Number(lastUp(a) > lastUp(b)));
  }
}
