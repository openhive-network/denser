import type { TApiSetId } from '@ui/config/api-set-ids';

/** A switch away from a node the user chose for one API set. */
export interface IApiNodeSwitchDetail {
  setId: TApiSetId;
  /** The node the user chose, which failed. */
  selected: string;
}

type TApiNodeSwitchListener = (node: string, detail?: IApiNodeSwitchDetail) => void;

const listeners = new Set<TApiNodeSwitchListener>();

/**
 * Subscribes to the browser switching its API node after the selected one failed, e.g. to retry
 * reads that failed before the switch. `detail` is given when the failed node is one the user
 * chose for an API set. Returns the unsubscribe function.
 */
export const onApiNodeSwitch = (listener: TApiNodeSwitchListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const announceApiNodeSwitch = (node: string, detail?: IApiNodeSwitchDetail): void => {
  listeners.forEach((listener) => listener(node, detail));
};
