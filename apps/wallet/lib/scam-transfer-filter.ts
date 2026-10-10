import type { HiveOperation } from '@hive/common-hiveio-packages/wax';

/** The senders whose incoming transfers the history hides, by why they are hidden. */
export interface HiddenSenders {
  /** The shared bad-actor list. */
  badActors: ReadonlySet<string>;
  /** The accounts the viewer muted. */
  muted: ReadonlySet<string>;
}

export type HiddenTransferReason = 'badActor' | 'muted';

/**
 * Why `operation`, which moves funds (and its memo) from another account to `username`, is hidden,
 * or `undefined` when it is shown. A sender on both lists counts as a bad actor.
 * Operations sent by `username` are never hidden, so a scammer's own wrongdoing stays visible.
 */
export const getHiddenTransferReason = (
  { op }: Pick<HiveOperation, 'op'>,
  username: string,
  { badActors, muted }: HiddenSenders
): HiddenTransferReason | undefined => {
  const from = op?.value?.from;
  if (!from || from === username || op.value.to !== username) return undefined;
  if (badActors.has(from)) return 'badActor';
  if (muted.has(from)) return 'muted';
  return undefined;
};
