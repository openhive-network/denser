/**
 * Permlinks for bridged replies, minted client-side (instant-comment spec §B.1):
 *   re-<parent-author>-<parent-permlink prefix>-<content-hash prefix><random>
 * Hive permlinks: lowercase a-z, 0-9, '-'; up to 256 chars; unique per (author, permlink).
 */
const MAX_PARENT_SLUG = 60;
const HASH_PREFIX = 6;
const RANDOM_SUFFIX = 4;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function slug(text: string, max: number): string {
  return text.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
}

function randomSuffix(length: number): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => ALPHABET[b % ALPHABET.length] ?? 'a').join('');
}

export function mintReplyPermlink(parentAuthor: string, parentPermlink: string, contentHashHex: string): string {
  const parent = slug(`${parentAuthor}-${parentPermlink}`, MAX_PARENT_SLUG);
  return `re-${parent}-${contentHashHex.slice(0, HASH_PREFIX)}${randomSuffix(RANDOM_SUFFIX)}`;
}

export function isValidPermlink(permlink: string): boolean {
  return /^[a-z0-9-]{1,256}$/.test(permlink);
}
