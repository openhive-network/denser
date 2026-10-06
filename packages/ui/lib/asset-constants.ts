/**
 * Centralized asset constants for Hive blockchain tokens.
 * They start as the Hive protocol values and are replaced by wax's chain.ASSETS once
 * the chain is created, so they are usable before (or without) loading wax's wasm.
 *
 * Use getAssetConfig(), getNaiSymbols(), etc. for type-safe access.
 */
import type { EAssetName, NaiAsset } from '@hiveio/wax';

/** Name of a Hive asset: the values of wax's `EAssetName`, without importing wax at runtime. */
export type AssetName = `${EAssetName}`;

// Symbol enum for type safety - includes SPK which is not a native Hive asset
export enum Symbol {
  HIVE = 'HIVE',
  HBD = 'HBD',
  VESTS = 'VESTS',
  SPK = 'SPK'
}

// NAIs and precisions are fixed by the Hive protocol: wax's chain.ASSETS holds the same values
// on every network.
const PROTOCOL_ASSETS: Readonly<Record<AssetName, NaiAsset>> = {
  HBD: { amount: '0', precision: 3, nai: '@@000000013' },
  HIVE: { amount: '0', precision: 3, nai: '@@000000021' },
  VESTS: { amount: '0', precision: 6, nai: '@@000000037' }
};

let assetConfig: Readonly<Record<AssetName, NaiAsset>> = PROTOCOL_ASSETS;

/**
 * Initialize asset constants from wax's chain.ASSETS.
 * Called once the chain is created.
 */
export function initializeAssetConstants(assets: Readonly<Record<AssetName, NaiAsset>>): void {
  assetConfig = assets;
}

/**
 * Get the full asset configuration.
 */
export function getAssetConfig(): Readonly<Record<AssetName, NaiAsset>> {
  return assetConfig;
}

/**
 * Get NAI string for a token type.
 */
export function getNai(token: AssetName): string {
  return getAssetConfig()[token].nai;
}

/**
 * Get precision for a token type.
 */
export function getPrecision(token: AssetName): number {
  return getAssetConfig()[token].precision;
}

/**
 * A NaiAsset of `satoshis` of the given token, as wax's `hiveSatoshis` / `hbdSatoshis` /
 * `vestsSatoshis` create it.
 */
export function createNaiAsset(token: AssetName, satoshis: bigint | number | string): NaiAsset {
  return { ...getAssetConfig()[token], amount: satoshis.toString() };
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
