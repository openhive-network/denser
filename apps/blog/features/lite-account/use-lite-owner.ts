'use client';

import type { Entry } from '@hive/common-hiveio-packages/wax';
import { isLiteOwner, isLiteTombstone, liteManageCapabilities, type LiteManageCapabilities } from './lite-ownership';
import { useLiteIdentity } from './use-lite-identity';
import { relayAppIds, useLiteRelayInfo } from './use-lite-relay-info';

/** Whether this browser's lite identity wrote `entry` (by its DID author, or the attester on a compat node). */
export function useIsLiteOwner(entry: Entry): boolean {
  const relay = useLiteRelayInfo();
  const { identity } = useLiteIdentity();
  return !!relay.data?.enabled && isLiteOwner(entry, identity?.name, relay.data.apps);
}

/** Whether `entry` is a lite post the gateway blank-edited to its tombstone. */
export function useIsLiteTombstone(entry: Pick<Entry, 'json_metadata'> | null | undefined): boolean {
  const relay = useLiteRelayInfo();
  return !!entry && isLiteTombstone(entry, relayAppIds(relay.data));
}

/** The Edit and Delete this browser's lite identity gets for `entry`: none unless it owns it and the gateway takes them. */
export function useLiteManageCapabilities(entry: Entry): LiteManageCapabilities {
  const relay = useLiteRelayInfo();
  const owner = useIsLiteOwner(entry);
  const tombstoned = useIsLiteTombstone(entry);
  const features = owner && relay.data?.enabled ? relay.data.features : undefined;
  return liteManageCapabilities(entry, features, tombstoned);
}
