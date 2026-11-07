import type { BroadcastSettlement } from './unconfirmed-broadcasts';

/** A broadcast that may still apply, settled: `transactionId` is the id the user was shown. */
export interface IBroadcastSettled {
  transactionId: string;
  settlement: BroadcastSettlement;
}

type BroadcastSettledListener = (settled: IBroadcastSettled) => void;

const listeners = new Set<BroadcastSettledListener>();

/**
 * Tells every listener how a broadcast that may still apply settled. Imports nothing from wax, so a
 * page can listen from its first render while `TransactionService` loads only on first write.
 */
export const notifyBroadcastSettled = (settled: IBroadcastSettled): void => {
  listeners.forEach((listener) => listener(settled));
};

/** Calls `listener` for every broadcast settled from now on; returns the unsubscribe. */
export const subscribeToBroadcastSettlement = (listener: BroadcastSettledListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
