import { getLogger } from '@hive/ui/lib/logging';
import { getCookie } from '@ui/lib/utils';
import {
  readCondenserLanguage,
  removeCondenserKeys,
  type CondenserMigrationProfile
} from '@smart-signer/lib/condenser-migration';
import { cookieName, languages } from '@/wallet/i18n/settings';

// Direct localStorage access is intentional: we write Denser's legacy `node-endpoint`
// key, which has no TTL structure.
/* eslint-disable no-restricted-globals */

const logger = getLogger('app');

/**
 * Migrates language preference from Condenser's `language` key to Denser's `NEXT_LOCALE` cookie.
 * Only migrates if NEXT_LOCALE cookie doesn't already exist.
 */
function migrateLanguage(): void {
  try {
    // Skip if Denser already has a language set via cookie
    if (getCookie(cookieName)) return;

    const locale = readCondenserLanguage(languages);
    if (locale) {
      document.cookie = `${cookieName}=${locale}; path=/; SameSite=Lax`;
      logger.info('Condenser wallet migration: language "%s" migrated to %s cookie', locale, cookieName);
    }
  } catch (error) {
    logger.error(error, 'Condenser wallet migration: failed to migrate language');
  }
}

/**
 * Migrates API endpoint preference from Condenser's `user_preferred_api_endpoint` cookie
 * to Denser's `node-endpoint` localStorage key.
 *
 * Condenser stores the endpoint as a plain cookie value (URL string).
 * Denser reads it as JSON.parse(localStorage.getItem('node-endpoint')).
 *
 * Only migrates if `node-endpoint` is not already set.
 */
function migrateApiEndpoint(): void {
  try {
    // Skip if Denser already has a custom endpoint
    if (localStorage.getItem('node-endpoint')) return;

    const endpoint = getCookie('user_preferred_api_endpoint');
    if (!endpoint) return;

    // Basic URL validation
    try {
      new URL(endpoint);
    } catch {
      logger.warn('Condenser wallet migration: invalid endpoint URL "%s"', endpoint);
      return;
    }

    // Denser stores endpoints as JSON-stringified values
    localStorage.setItem('node-endpoint', JSON.stringify(endpoint));
    logger.info('Condenser wallet migration: API endpoint "%s" migrated to node-endpoint', endpoint);
  } catch (error) {
    logger.error(error, 'Condenser wallet migration: failed to migrate API endpoint');
  }
}

/**
 * Removes known Condenser localStorage keys and cookies that are no longer needed.
 */
function cleanupCondenserStorage(): void {
  removeCondenserKeys();

  // Remove Condenser's API endpoint cookie (expire it)
  document.cookie = 'user_preferred_api_endpoint=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export const WALLET_CONDENSER_MIGRATION: CondenserMigrationProfile = {
  migratedFlagKey: 'condenser-wallet-migrated',
  logLabel: 'Condenser wallet migration',
  migrateSettings: () => {
    migrateLanguage();
    migrateApiEndpoint();
  },
  // No autopost2: nothing more to migrate
  cleanupWithoutLogin: cleanupCondenserStorage,
  cleanup: cleanupCondenserStorage
};
