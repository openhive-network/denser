'use client';

import { useEffect, useRef } from 'react';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import {
  parseAutopost2,
  isAlreadyMigrated,
  markMigrated,
  migrateLanguage,
  migrateCondenserData
} from '../lib/condenser-migration';
import { getLogger } from '@hive/ui/lib/logging';

// Direct localStorage access is intentional: migration cleanup of Condenser's legacy keys.
/* eslint-disable no-restricted-properties */

const logger = getLogger('app');

/**
 * Invisible component that detects Condenser login data in localStorage
 * and automatically logs the user into Denser.
 *
 * Handles two login methods from Condenser:
 * - WIF key (stored in autopost2 as posting private key)
 * - Keychain (detected via autopost2 flag + extension presence)
 *
 * Runs once on mount, sets a flag to prevent re-execution.
 */
export default function CondenserMigration() {
  const signIn = useSignIn();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    migrate().catch((error) => logger.error(error, 'Condenser migration failed'));

    async function migrate() {
      if (isAlreadyMigrated()) return;

      // Language migration runs regardless of login data
      migrateLanguage();

      const data = parseAutopost2();
      if (!data) {
        // No autopost2 means no condenser login — only remove migration markers,
        // not user data (replyEditorData-*, voteWeight-* etc.) which may belong to
        // users who have drafts/templates but never logged in via condenser.
        localStorage.removeItem('autopost2');
        localStorage.removeItem('autopost');
        localStorage.removeItem('saveLogin');
        markMigrated();
        return;
      }

      // Migrate user data (templates, drafts, vote weights) before login attempt.
      // These are synchronous and idempotent, so safe to run even if login retries later.
      migrateCondenserData(data.username);

      // Signing the login needs wax and the signers: load them only for a Condenser user.
      const { loginCondenserUser } = await import('../lib/condenser-login');
      await loginCondenserUser(data, (loginData) => signIn.mutateAsync({ data: loginData }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
