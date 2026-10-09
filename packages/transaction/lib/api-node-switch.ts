type TApiNodeSwitchListener = (node: string) => void;

const listeners = new Set<TApiNodeSwitchListener>();

/**
 * Subscribes to the browser switching its API node after the selected one failed, e.g. to retry
 * reads that failed before the switch. Returns the unsubscribe function.
 */
export const onApiNodeSwitch = (listener: TApiNodeSwitchListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const announceApiNodeSwitch = (node: string): void => {
  listeners.forEach((listener) => listener(node));
};
