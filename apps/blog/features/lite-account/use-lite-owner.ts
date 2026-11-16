'use client';

import type { Entry } from '@hive/common-hiveio-packages/wax';
import { isLiteOwner, isLiteTombstone, liteManageCapabilities, type LiteManageCapabilities } from './lite-ownership';
import { relayAppIds, useLiteRelaySelect, type LiteRelayInfo } from './use-lite-relay-info';
import { useStoredLiteIdentity } from './use-stored-lite-identity';

const ownedBy = (entry: Entry, identityName: string | undefined, info: LiteRelayInfo): boolean =>
  info.enabled && isLiteOwner(entry, identityName, info.apps);

/** Whether this browser's lite identity wrote `entry` (by its DID author, or the attester on a compat node). */
export function useIsLiteOwner(entry: Entry): boolean {
  const identity = useStoredLiteIdentity();
  return useLiteRelaySelect((info) => ownedBy(entry, identity?.name, info));
}

/** Whether `entry` is a lite post the gateway blank-edited to its tombstone. */
export function useIsLiteTombstone(entry: Pick<Entry, 'json_metadata'> | null | undefined): boolean {
  return useLiteRelaySelect((info) => !!entry && isLiteTombstone(entry, relayAppIds(info)));
}

/** The Edit and Delete this browser's lite identity gets for `entry`: none unless it owns it and the gateway takes them. */
export function useLiteManageCapabilities(entry: Entry): LiteManageCapabilities {
  const identity = useStoredLiteIdentity();
  return useLiteRelaySelect((info) => {
    const features = info.enabled && isLiteOwner(entry, identity?.name, info.apps) ? info.features : undefined;
    return liteManageCapabilities(entry, features, isLiteTombstone(entry, relayAppIds(info)));
  });
}
