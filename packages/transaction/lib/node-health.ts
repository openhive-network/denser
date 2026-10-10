import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/** How long a node that failed is skipped before one call is let through to probe it. */
export const NODE_COOLDOWN_MS = 30_000;

export interface INodeHealthOptions {
  cooldownMs?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

/** `healthy`: no failure on record. `probe`: the cooldown has passed and this caller tests the node. */
export type TNodeAdmission = 'healthy' | 'probe';

/**
 * Process-wide circuit breaker over API nodes, keyed by node URL. It holds no request data, only
 * when each failed node may be tried again. A node marked down is skipped until its cooldown ends;
 * the first caller after that is admitted as a probe while everyone else keeps skipping it, and the
 * probe's outcome either clears the node or restarts its cooldown.
 */
export class NodeHealth {
  private readonly downUntil = new Map<string, number>();
  private readonly lastUpAt = new Map<string, number>();
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor({ cooldownMs = NODE_COOLDOWN_MS, now = Date.now }: INodeHealthOptions = {}) {
    this.cooldownMs = cooldownMs;
    this.now = now;
  }

  /** Whether `node` is inside its cooldown. Does not claim a probe. */
  isDown(node: string): boolean {
    const until = this.downUntil.get(node);
    return until !== undefined && this.now() < until;
  }

  /** Admits a call to `node`, claiming the probe when its cooldown has passed; `undefined` = skip it. */
  admit(node: string): TNodeAdmission | undefined {
    if (!this.downUntil.has(node)) return 'healthy';
    if (this.isDown(node)) return undefined;
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

  /** `nodes` with the most recently healthy first; nodes never seen healthy keep their order, last. */
  byRecentHealth(nodes: readonly string[]): string[] {
    const lastUp = (node: string) => this.lastUpAt.get(node) ?? Number.NEGATIVE_INFINITY;
    return [...nodes].sort((a, b) => Number(lastUp(b) > lastUp(a)) - Number(lastUp(a) > lastUp(b)));
  }
}
