import type { LiteAppIds } from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { liteAttribution } from './lite-attribution.ts';
import { isLiteDid, liteNameOf } from './lite-did.ts';
import type { LiteRelayFeatures } from './lite-relay-info-query';

type Located = Pick<Entry, 'author' | 'permlink' | 'url' | '_optimistic'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The lite name a post or comment belongs to: the name of its `did:lite:` author on a lite-aware
 * node, else the attester of the gate's marker in json_metadata (compat output).
 */
export function liteOwnerName(entry: Pick<Entry, 'author' | 'json_metadata'>, apps: LiteAppIds): string | undefined {
  if (isLiteDid(entry.author)) return liteNameOf(entry.author);
  return liteAttribution(entry.json_metadata, apps)?.attester;
}

/** Whether the lite identity `identityName` (none: not a lite author here) owns `entry`. */
export function isLiteOwner(
  entry: Pick<Entry, 'author' | 'json_metadata'>,
  identityName: string | undefined,
  apps: LiteAppIds
): boolean {
  return !!identityName && liteOwnerName(entry, apps) === identityName;
}

// `/<category>/@<author>/<permlink>`, or for a comment `/<category>/@<root author>/<root>#@<author>/<permlink>`.
const URL_LOCATION = /@([^/#@]+)\/([^/#?@]+)$/;

/**
 * The gate account that posted `entry` on L1 (edits and deletes name it): its author, unless that
 * is a DID, which a lite-aware node puts in `author` while `url` keeps the L1 location. An
 * optimistic entry names it only once the gateway has answered (see `withRelayedReply`).
 */
export function liteL1Author(entry: Located): string | undefined {
  if (!isLiteDid(entry.author)) return entry._optimistic && !entry.url.includes('#') ? undefined : entry.author;
  const hash = entry.url.indexOf('#');
  const match = URL_LOCATION.exec(hash >= 0 ? entry.url.slice(hash + 1) : entry.url);
  if (!match || match[2] !== entry.permlink || match[1].startsWith('did:')) return undefined;
  return match[1];
}

export type LiteL1Parent = { author: string; permlink: string };

/**
 * The L1 parent of `entry` (an edit may not move a comment, and the tombstone keeps the parent):
 * '' and the category for a root post. A DID parent is looked up with `findEntry` (the discussion
 * the comment was read in), or read from the comment's own `url` when the parent is the root.
 */
export function liteL1Parent(
  entry: Located & Pick<Entry, 'parent_author' | 'parent_permlink' | 'category'>,
  findEntry: (author: string, permlink: string) => Located | undefined
): LiteL1Parent | undefined {
  const { parent_author: parentAuthor, parent_permlink: parentPermlink } = entry;
  if (!parentAuthor) return { author: '', permlink: parentPermlink || entry.category };
  if (!parentPermlink) return undefined;
  if (!isLiteDid(parentAuthor)) return { author: parentAuthor, permlink: parentPermlink };
  const parent = findEntry(parentAuthor, parentPermlink);
  const fromParent = parent ? liteL1Author(parent) : undefined;
  if (fromParent) return { author: fromParent, permlink: parentPermlink };
  const root = /^\/[^/]+\/@([^/#]+)\/([^/#?]+)#/.exec(entry.url);
  return root && root[2] === parentPermlink && !root[1].startsWith('did:')
    ? { author: root[1], permlink: parentPermlink }
    : undefined;
}

/** Whether `entry` is the tombstone the gateway blank-edits a lite post to: its marker says `deleted: true`. */
export function isLiteTombstone(entry: Pick<Entry, 'json_metadata'>, apps: LiteAppIds): boolean {
  const metadata: unknown = entry.json_metadata;
  if (!isRecord(metadata)) return false;
  const marker = metadata[apps.posts];
  return isRecord(marker) && marker.deleted === true && typeof marker.attester === 'string';
}

export type LiteManageCapabilities = { canEdit: boolean; canDelete: boolean };

const NONE: LiteManageCapabilities = { canEdit: false, canDelete: false };

/**
 * What the lite owner may do with their entry on a gateway with `features`. Without tombstone
 * deletes, a post with replies, net-positive votes or past payout (which hived refuses to delete)
 * offers no Delete.
 */
export function liteManageCapabilities(
  entry: Located & Pick<Entry, 'children' | 'net_rshares' | 'is_paidout'>,
  features: LiteRelayFeatures | undefined,
  tombstoned: boolean
): LiteManageCapabilities {
  if (!features || tombstoned || !liteL1Author(entry)) return NONE;
  const removable = entry.children === 0 && !(entry.net_rshares > 0) && !entry.is_paidout;
  return { canEdit: !!features.edits, canDelete: !!features.deletes && (!!features.tombstone_deletes || removable) };
}

const ERROR_KEYS: Record<string, string> = {
  not_owner: 'not_owner',
  wrong_gateway: 'not_owner',
  not_found: 'not_found',
  edits_disabled: 'edits_disabled',
  rate_limited: 'rate_limited',
  banned: 'banned',
  body_too_large: 'body_too_large',
  invalid_request: 'invalid_request',
  content_mismatch: 'invalid_request',
  bad_signature: 'invalid_request',
  broadcast_failed: 'broadcast_failed',
  relay_unavailable: 'relay_unavailable'
};

/** The `lite_account.manage.errors.*` key explaining a failed edit or delete. */
export function liteManageErrorKey(code: string | undefined): string {
  return (code !== undefined ? ERROR_KEYS[code] : undefined) ?? 'unknown';
}
