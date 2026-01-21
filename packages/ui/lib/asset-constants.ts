/**
 * Centralized asset constants for Hive blockchain tokens.
 * Values are sourced from wax's chain.ASSETS to ensure consistency.
 *
 * Usage:
 * 1. Call initializeAssetConstants(chain.ASSETS) during app bootstrap
 * 2. Use getAssetConfig(), getNaiSymbols(), etc. for type-safe access
 */
import { EAssetName, NaiAsset } from '@hiveio/wax';

// Re-export EAssetName for convenience
export { EAssetName };

// Symbol enum for type safety - includes SPK which is not a native Hive asset
export enum Symbol {
  HIVE = 'HIVE',
  HBD = 'HBD',
  VESTS = 'VESTS',
  SPK = 'SPK'
}

// Cached asset configuration from wax
let assetConfig: Readonly<Record<EAssetName, NaiAsset>> | null = null;

/**
 * Initialize asset constants from wax's chain.ASSETS.
 * Should be called once during app bootstrap after chain is created.
 */
export function initializeAssetConstants(assets: Readonly<Record<EAssetName, NaiAsset>>): void {
  assetConfig = assets;
}

/**
 * Check if asset constants have been initialized
 */
export function isAssetConstantsInitialized(): boolean {
  return assetConfig !== null;
}

/**
 * Get the full asset configuration from wax.
 * Throws if not initialized.
 */
export function getAssetConfig(): Readonly<Record<EAssetName, NaiAsset>> {
  if (!assetConfig) {
    throw new Error('Asset constants not initialized. Call initializeAssetConstants(chain.ASSETS) first.');
  }
  return assetConfig;
}

/**
 * Get NAI string for a token type.
 * Throws if not initialized.
 */
export function getNai(token: EAssetName): string {
  return getAssetConfig()[token].nai;
}

/**
 * Get precision for a token type.
 * Throws if not initialized.
 */
export function getPrecision(token: EAssetName): number {
  return getAssetConfig()[token].precision;
}

/**
 * Get NAI to symbol mapping.
 * Useful for converting NaiAsset.nai to display symbol.
 */
export function getNaiSymbols(): Record<string, string> {
  const config = getAssetConfig();
  return {
    [config.HIVE.nai]: 'HIVE',
    [config.HBD.nai]: 'HBD',
    [config.VESTS.nai]: 'VESTS'
  };
}

/**
 * Get NAI to Symbol enum mapping.
 */
export function getNaiToSymbol(): Record<string, Symbol> {
  const config = getAssetConfig();
  return {
    [config.HIVE.nai]: Symbol.HIVE,
    [config.HBD.nai]: Symbol.HBD,
    [config.VESTS.nai]: Symbol.VESTS
  };
}
