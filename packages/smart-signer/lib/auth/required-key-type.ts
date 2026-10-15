import { createContext } from 'react';
import { KeyType } from '@smart-signer/types/common';

/**
 * The key type a session must be able to sign with to count as signed in to this app. Apps sharing
 * one origin share the session, so an app that signs with the active key sets this to keep a
 * posting-key session from another app out of its signed-in pages, unless the session holds the
 * active key too (`lacksRequiredKeyType` in login-authority.ts). Unset: any session counts.
 */
export const RequiredKeyTypeContext = createContext<KeyType | undefined>(undefined);
