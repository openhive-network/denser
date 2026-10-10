import type { HiveOperation } from '@hive/common-hiveio-packages/wax';

/**
 * Whether `operation` moves funds (and its memo) from a scam sender to `username`.
 * Operations sent by `username` are never matched, so a scammer's own wrongdoing stays visible.
 */
export const isIncomingFromScamSender = (
  { op }: Pick<HiveOperation, 'op'>,
  username: string,
  scamSenders: ReadonlySet<string>
): boolean => {
  const from = op?.value?.from;
  if (!from || from === username || op.value.to !== username) return false;
  return scamSenders.has(from);
};
