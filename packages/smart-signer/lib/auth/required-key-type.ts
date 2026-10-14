import { createContext } from 'react';
import { KeyType, type User } from '@smart-signer/types/common';

/**
 * The key type a session must have been signed in with to count as signed in to this app. Apps
 * sharing one origin share the session, so an app that signs with the active key sets this to keep a
 * posting-key session from another app out of its signed-in pages. Unset: any session counts.
 */
export const RequiredKeyTypeContext = createContext<KeyType | undefined>(undefined);

/** True when `user` is signed in, but with a weaker key than `requiredKeyType`. */
export function lacksRequiredKeyType(user: User, requiredKeyType: KeyType | undefined): boolean {
  return user.isLoggedIn && requiredKeyType === KeyType.active && user.keyType === KeyType.posting;
}
