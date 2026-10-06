'use client';

import { useEffect, useRef } from 'react';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import {
  parseAutopost2,
  cleanupCondenserStorage,
  isAlreadyMigrated,
  markMigrated,
  migrateLanguage,
  migrateApiEndpoint
} from '../lib/condenser-migration';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Invisible component that detects Condenser wallet login data in localStorage
 * and automatically logs the user into Denser wallet.
 *
 * Handles two login methods from Condenser:
 * - WIF key (stored in autopost2 as posting private key)
 * - Keychain (detected via autopost2 flag + extension presence)
 *
 * Also migrates language preference and API endpoint setting.
 * Runs once on mount, sets a flag to prevent re-execution.
 */
export default function CondenserMigration() {
  const signIn = useSignIn();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    migrate().catch((error) => logger.error(error, 'Condenser wallet migration failed'));

    async function migrate() {
      if (isAlreadyMigrated()) return;

      // Settings migrations run regardless of login data
      migrateLanguage();
      migrateApiEndpoint();

      const data = parseAutopost2();
      if (!data) {
        // No autopost2: nothing more to migrate
        cleanupCondenserStorage();
        markMigrated();
        return;
      }

      // Signing the login needs wax and the signers: load them only for a Condenser user.
      const { loginCondenserUser } = await import('../lib/condenser-login');
      await loginCondenserUser(data, (loginData) => signIn.mutateAsync({ data: loginData }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
