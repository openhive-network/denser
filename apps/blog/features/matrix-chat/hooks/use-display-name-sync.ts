'use client';

import { useEffect } from 'react';
import { getLogger } from '@ui/lib/logging';
import { getHiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';
import { profileDisplayName } from '@smart-signer/lib/oauth/profile-text';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';

const logger = getLogger('app');

/**
 * Once `session` has signed in, gives its Matrix user the display name of `username`'s Hive
 * profile, when the profile names one and the Matrix profile has another. A failure is logged and
 * left for the next sign-in.
 */
export function useDisplayNameSync(session: ChatSession | null, username: string): void {
  useEffect(() => {
    if (!session || !username) return;
    let current = true;
    getHiveUserProfile(username)
      .then((profile) => {
        const name = profileDisplayName(profile);
        return current && name ? session.syncDisplayName(name) : false;
      })
      .then((changed) => {
        if (changed) logger.info('The Matrix display name follows the Hive profile of %s', username);
      })
      .catch((error: unknown) => logger.warn('The Matrix display name could not be updated: %o', error));
    return () => {
      current = false;
    };
  }, [session, username]);
}
