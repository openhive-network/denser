import getSlug from 'speakingurl';
import base58 from 'bs58';
import secureRandom from 'secure-random';
import { getPostHeader } from './bridge-api';
import { asset as assetFn, EAssetName } from '@hiveio/wax';
import { getChain } from './chain';

// Re-export EAssetName for convenience
export { EAssetName };

// Token type that accepts both enum values and string literals
type TokenType = EAssetName | 'HIVE' | 'HBD' | 'VESTS';

/**
 * Creates a NaiAsset using wax's chain.ASSETS for NAI and precision values.
 * This ensures consistency with the wax library's native asset definitions.
 */
export const createAsset = async (amount: string, token: TokenType) => {
  const chain = await getChain();
  const assetConfig = chain.ASSETS[token as EAssetName];
  return assetFn.create({
    amount,
    precision: assetConfig.precision,
    nai: assetConfig.nai
  });
};
export async function createPermlink(title: string, author: string) {
  let permlink;
  if (title && title.trim() !== '') {
    let s = getSlug(title.replace(/[<>]/g, ''), { truncate: 128 });
    if (s === '') {
      s = base58.encode(secureRandom.randomBuffer(4));
    }
    // only letters numbers and dashes shall survive
    s = s.toLowerCase().replace(/[^a-z0-9-]+/g, '');

    // ensure the permlink is unique
    let head;
    try {
      head = await getPostHeader(author, s);
    } catch (e) {}
    if (head && !!head.category) {
      const noise = base58.encode(secureRandom.randomBuffer(4)).toLowerCase();
      permlink = noise + '-' + s;
    } else {
      permlink = s;
    }

    // ensure permlink conforms to STEEMIT_MAX_PERMLINK_LENGTH
    if (permlink.length > 255) {
      permlink = permlink.substring(0, 255);
    }
  } else {
    permlink = Math.floor(Date.now() / 1000).toString(36);
  }

  return permlink;
}

/**
 * Parses a string value and creates a NaiAsset with proper precision validation.
 * Uses wax's chain.ASSETS for precision values to ensure consistency.
 */
export const getAsset = async (value: string, token: TokenType) => {
  const chain = await getChain();
  const { precision } = chain.ASSETS[token as EAssetName];

  // Validate decimal places
  const dotIndex = value.indexOf('.');
  if (dotIndex !== -1 && value.slice(dotIndex).length > precision + 1) {
    throw new Error(`There should be maximum of ${precision} decimal places in ${token} amount`);
  }

  const amount = Number(value).toFixed(precision).replace('.', '');
  return createAsset(amount, token);
};
