'use client';

import { servesLiteNotifications } from '@transaction/lib/lite-api';
import { liteActorDid } from './lite-social-state';
import { useLiteApiInfo } from './use-lite-api-info';
import { useStoredLiteIdentity } from './use-stored-lite-identity';

/** Whether the API node serves lite notifications and the lite name lookup (`lite.account_notifications`). */
export function useServesLiteNotifications(): boolean {
  return servesLiteNotifications(useLiteApiInfo());
}

/**
 * The DID of the browser's lite identity where it has notifications to read: the identity is
 * registered (the node knows it) and the node serves lite notifications; else null.
 */
export function useLiteNotificationsAccount(): string | null {
  const identity = useStoredLiteIdentity();
  const serves = useServesLiteNotifications();
  return serves && identity?.registered ? liteActorDid(identity.name) : null;
}
