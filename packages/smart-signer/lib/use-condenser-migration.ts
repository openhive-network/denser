'use client';

import { useEffect, useRef } from 'react';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { getLogger } from '@hive/ui/lib/logging';
import {
  isAlreadyMigrated,
  markMigrated,
  parseAutopost2,
  type CondenserMigrationProfile
} from './condenser-migration';

const logger = getLogger('app');

/**
 * Detects Condenser login data in localStorage and logs the user into Denser.
 *
 * Handles two login methods from Condenser:
 * - WIF key (stored in autopost2 as posting private key)
 * - Keychain (detected via autopost2 flag + extension presence)
 *
 * Runs once on mount; `profile` supplies the app's flag key, settings and data migrations and cleanup.
 */
export function useCondenserMigration(profile: CondenserMigrationProfile): void {
  const signIn = useSignIn();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    migrate().catch((error) => logger.error(error, '%s failed', profile.logLabel));

    async function migrate() {
      if (isAlreadyMigrated(profile)) return;

      // Settings migrations run regardless of login data
      profile.migrateSettings();

      const data = parseAutopost2();
      if (!data) {
        profile.cleanupWithoutLogin();
        markMigrated(profile);
        return;
      }

      profile.migrateUserData?.(data.username);

      // Signing the login needs wax and the signers: load them only for a Condenser user.
      const { loginCondenserUser } = await import('./condenser-login');
      await loginCondenserUser(data, (loginData) => signIn.mutateAsync({ data: loginData }), profile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
