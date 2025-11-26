import getSlug from 'speakingurl';
import base58 from 'bs58';
import secureRandom from 'secure-random';
import { getPostHeader } from './bridge-api';
import { asset as assetFn } from '@hiveio/wax';

export const HIVE_NAI_STRING = '@@000000021';
export const HIVE_PRECISION = 3;

export const HBD_NAI_STRING = '@@000000013';
export const HBD_PRECISION = 3;

export const ASSET_PRECISION = 3;

export const VESTS_NAI_STRING = '@@000000037';
export const VESTS_PRECISION = 6;

export const createAsset = (amount: string, token: 'HIVE' | 'HBD' | 'VESTS') => {
  switch (token) {
    case 'HIVE':
      return assetFn.create({
        amount,
        precision: HIVE_PRECISION,
        nai: HIVE_NAI_STRING
      });
    case 'HBD':
      return assetFn.create({
        amount,
        precision: HBD_PRECISION,
        nai: HBD_NAI_STRING
      });
    case 'VESTS':
      return assetFn.create({
        amount,
        precision: VESTS_PRECISION,
        nai: VESTS_NAI_STRING
      });
  }
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

export const getAsset = async (value: string, curr: 'HIVE' | 'HBD' | 'VESTS') => {
  switch (curr) {
    case 'HIVE':
      if (value.slice(value.indexOf('.')).length > HIVE_PRECISION + 1) {
        throw new Error('There should be maximum of 3 decimal places in amount');
      }
      const hiveAmount = Number(value).toFixed(HIVE_PRECISION).replace('.', '');
      return createAsset(hiveAmount, curr);
    case 'HBD':
      if (value.slice(value.indexOf('.')).length > HBD_PRECISION + 1) {
        throw new Error('There should be maximum of 3 decimal places in amount');
      }
      const hbdAmount = Number(value).toFixed(HBD_PRECISION).replace('.', '');
      return createAsset(hbdAmount, curr);
    case 'VESTS':
      if (value.slice(value.indexOf('.')).length > VESTS_PRECISION + 1) {
        throw new Error('There should be maximum of 3 decimal places in amount');
      }
      const vestsAmount = Number(value).toFixed(VESTS_PRECISION).replace('.', '');
      return createAsset(vestsAmount, curr);
  }
};
