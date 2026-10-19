/*
 * Lite account identities as a lite-aware API node (`lite.*`) emits them: `did:lite:<name>` in
 * `author`, `parent_author` and the discussion keys. No Hive account name contains `:`, so a DID
 * never collides with one.
 */

export const LITE_DID_PREFIX = 'did:lite:';
const DID_PREFIX = 'did:';
// @hiveio/lite-account's LITE_NAME_PATTERN (isValidLiteName), copied: the package has a single
// entry point, and importing it would bundle its signing code into every page that lists authors.
const LITE_NAME_PATTERN = /^(?=.{3,16}$)[a-z][a-z0-9-]+[a-z0-9](\.[a-z][a-z0-9-]+[a-z0-9])*$/;

/** Whether `author` is a lite account DID with a valid lite name. */
export function isLiteDid(author: string | undefined | null): boolean {
  if (typeof author !== 'string' || !author.startsWith(LITE_DID_PREFIX)) return false;
  return LITE_NAME_PATTERN.test(author.slice(LITE_DID_PREFIX.length));
}

/** The lite name of a DID (`did:lite:bob` → `bob`), or undefined for anything else. */
export function liteNameOf(did: string): string | undefined {
  return isLiteDid(did) ? did.slice(LITE_DID_PREFIX.length) : undefined;
}

/** The name to show for a post author: the bare lite name of a DID, else the account name. */
export function authorDisplayName(author: string): string {
  return liteNameOf(author) ?? author;
}

export type TPostAuthorKind = 'lite' | 'account' | 'invalid';

/**
 * What a post route's author segment is: a lite DID, a candidate Hive account name (still to be
 * checked as one), or invalid — any other `did:` form, which no node resolves.
 */
export function postAuthorKind(author: string): TPostAuthorKind {
  if (isLiteDid(author)) return 'lite';
  return author.startsWith(DID_PREFIX) ? 'invalid' : 'account';
}

/**
 * The author of a post route's `@author` segment (`@bob`, `%40bob`, `@did:lite:bob`,
 * `%40did%3Alite%3Abob`), or null when the segment is not an `@` user segment or is malformed.
 */
export function postAuthorFromParam(param: string | undefined): string | null {
  if (!param) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }
  return decoded.startsWith('@') ? decoded.slice(1) : null;
}
