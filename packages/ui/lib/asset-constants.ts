/**
 * Centralized asset constants for Hive blockchain tokens.
 * They start as the Hive protocol values and are replaced by wax's chain.ASSETS once
 * the chain is created, so they are usable before (or without) loading wax's wasm.
 *
 * Use getAssetConfig(), getNaiSymbols(), etc. for type-safe access.
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

// NAIs and precisions are fixed by the Hive protocol: wax's chain.ASSETS holds the same values
// on every network.
const PROTOCOL_ASSETS: Readonly<Record<EAssetName, NaiAsset>> = {
  [EAssetName.HBD]: { amount: '0', precision: 3, nai: '@@000000013' },
  [EAssetName.HIVE]: { amount: '0', precision: 3, nai: '@@000000021' },
  [EAssetName.VESTS]: { amount: '0', precision: 6, nai: '@@000000037' }
};

let assetConfig: Readonly<Record<EAssetName, NaiAsset>> = PROTOCOL_ASSETS;

/**
 * Initialize asset constants from wax's chain.ASSETS.
 * Called once the chain is created.
 */
export function initializeAssetConstants(assets: Readonly<Record<EAssetName, NaiAsset>>): void {
  assetConfig = assets;
}

/**
 * Get the full asset configuration.
 */
export function getAssetConfig(): Readonly<Record<EAssetName, NaiAsset>> {
  return assetConfig;
}

/**
 * Get NAI string for a token type.
 */
export function getNai(token: EAssetName): string {
  return getAssetConfig()[token].nai;
}

/**
 * Get precision for a token type.
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
