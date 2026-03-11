import { getLogger } from '@hive/ui/lib/logging';
import { setStorageItem, getStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { languages } from '@/blog/i18n/settings';
import { setLanguage } from '@/blog/utils/language';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// keys which have no TTL structure, plus one-time migration flags.
/* eslint-disable no-restricted-globals */

const logger = getLogger('app');

const MIGRATION_FLAG_KEY = 'condenser-migrated';

// Hive account names: 3-16 chars, start with letter, only lowercase + digits + dots + hyphens.
const ACCOUNT_NAME_REGEX = /^[a-z][a-z0-9.-]{2,15}$/;

export interface CondenserLoginData {
  username: string;
  postingWif: string;
  loginWithKeychain: boolean;
}

/**
 * Decodes a hex-encoded string to UTF-8.
 * Condenser stores autopost2 as hex-encoded tab-separated data.
 */
function hexToString(hex: string): string {
  const bytes = new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
  return new TextDecoder().decode(bytes);
}

/**
 * Parses the Condenser `autopost2` localStorage entry.
 *
 * Format (hex-encoded, tab-separated):
 * [0] username
 * [1] postingWif
 * [2] memoWif
 * [3] login_owner_pubkey
 * [4] login_with_keychain ("true" / "")
 * [5-11] other flags (hivesigner, hiveauth, tokens)
 */
export function parseAutopost2(): CondenserLoginData | null {
  try {
    const raw = localStorage.getItem('autopost2');
    if (!raw) return null;

    const decoded = hexToString(raw);
    const fields = decoded.split('\t');

    const username = fields[0]?.trim();
    if (!username || !ACCOUNT_NAME_REGEX.test(username)) return null;

    return {
      username,
      postingWif: fields[1] || '',
      loginWithKeychain: fields[4] === 'true'
    };
  } catch (error) {
    logger.error(error, 'Failed to parse Condenser autopost2');
    return null;
  }
}

// --- Condenser data format types ---

interface CondenserBeneficiary {
  username: string;
  percent: string;
}

interface CondenserTemplate {
  name: string;
  beneficiaries?: CondenserBeneficiary[];
  payoutType?: string;
  maxAcceptedPayout?: number | null;
  markdown?: string;
  title?: string;
  summary?: string;
  altAuthor?: string;
  tags?: string;
  community?: string;
}

interface CondenserDraft {
  formId?: string;
  title?: string;
  tags?: string;
  body?: string;
  summary?: string;
  altAuthor?: string;
  payoutType?: string;
  beneficiaries?: CondenserBeneficiary[];
  maxAcceptedPayout?: number | null;
}

// --- Denser data format types ---

interface DenserBeneficiary {
  account: string;
  weight: string;
}

interface DenserTemplate {
  templateTitle: string;
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
  beneficiaries: DenserBeneficiary[];
  maxAcceptedPayout: number;
  payoutType: string;
}

interface DenserDraft {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
  beneficiaries: DenserBeneficiary[];
  maxAcceptedPayout: number;
  payoutType: string;
}

// --- Field conversion helpers ---

function convertBeneficiaries(condenserBeneficiaries?: CondenserBeneficiary[]): DenserBeneficiary[] {
  if (!Array.isArray(condenserBeneficiaries)) return [];
  return condenserBeneficiaries.map((b) => ({
    account: b.username || '',
    weight: b.percent || '0'
  }));
}

function convertMaxAcceptedPayout(condenserValue: number | null | undefined, payoutType?: string): number {
  if (condenserValue != null) return condenserValue;
  // Derive from payoutType when maxAcceptedPayout is not stored (e.g. condenser templates)
  if (payoutType === '0%') return 0; // decline payout
  return 1000000; // no limit
}

function isCondenserTemplate(item: unknown): item is CondenserTemplate {
  return typeof item === 'object' && item !== null && 'name' in item && !('templateTitle' in item);
}

/**
 * Converts Condenser payout type strings to Denser format.
 * Condenser: '50/50', '100%-power', '0%'
 * Denser:    '50%',   '100%',        '0%'
 */
function convertPayoutType(condenserType: string | undefined): string {
  const map: Record<string, string> = {
    '50/50': '50%',
    '100%-power': '100%',
    '0%': '0%'
  };
  return (condenserType && map[condenserType]) ?? '50%';
}

// --- Migration functions ---

/**
 * Migrates language preference from Condenser's `language` key
 * (stored via the `store` npm package as raw JSON) to Denser's `NEXT_LOCALE`.
 * Only migrates if NEXT_LOCALE doesn't already exist.
 */
export function migrateLanguage(): void {
  try {
    // Skip if Denser already has a language set
    if (getStorageItem<string>('NEXT_LOCALE')) return;

    const raw = localStorage.getItem('language');
    if (!raw) return;

    // The `store` npm package JSON.stringifies the value, so we parse it
    let locale: string;
    try {
      locale = JSON.parse(raw);
    } catch {
      // If not valid JSON, try using the raw value
      locale = raw;
    }

    if (typeof locale === 'string' && languages.includes(locale)) {
      setLanguage(locale);
      logger.info('Condenser migration: language "%s" migrated to NEXT_LOCALE', locale);
    }
  } catch (error) {
    logger.error(error, 'Condenser migration: failed to migrate language');
  }
}

/**
 * Migrates post templates from Condenser format to Denser format.
 * Both use the same key `hivePostTemplates-{username}` but different field names.
 *
 * Condenser: { name, markdown, summary, altAuthor, community, beneficiaries: [{username, percent}] }
 * Denser:    { templateTitle, postArea, postSummary, author, category, beneficiaries: [{account, weight}] }
 */
export function migrateTemplates(username: string): void {
  try {
    const key = `hivePostTemplates-${username}`;

    // Use getStorageItem to handle both raw condenser JSON and TTL-wrapped format.
    // StorageCleanup may have already wrapped the raw data before this runs.
    const templates = getStorageItem<unknown[]>(key);
    if (!Array.isArray(templates) || templates.length === 0) return;

    // Check if any templates are in condenser format (has `name` instead of `templateTitle`)
    const hasCondenserFormat = templates.some(isCondenserTemplate);
    if (!hasCondenserFormat) return;

    const converted: DenserTemplate[] = templates.map((t) => {
      if (isCondenserTemplate(t)) {
        return {
          templateTitle: t.name,
          title: t.title || '',
          postArea: t.markdown || '',
          postSummary: t.summary || '',
          tags: t.tags || '',
          author: t.altAuthor || '',
          category: t.community || 'blog',
          beneficiaries: convertBeneficiaries(t.beneficiaries),
          maxAcceptedPayout: convertMaxAcceptedPayout(t.maxAcceptedPayout, t.payoutType),
          payoutType: convertPayoutType(t.payoutType)
        };
      }
      // Already in denser format, keep as-is
      return t as DenserTemplate;
    });

    setStorageItem(key, converted, StorageTTL.PERMANENT);
    logger.info('Condenser migration: %d templates migrated for user %s', converted.length, username);
  } catch (error) {
    logger.error(error, 'Condenser migration: failed to migrate templates for user %s', username);
  }
}

/**
 * Migrates the new-post draft from Condenser's `replyEditorData-submitStory`
 * to Denser's `postData-new-{username}`.
 *
 * Only migrates if the denser draft key doesn't already exist.
 */
export function migrateDraft(username: string): void {
  try {
    const denserKey = `postData-new-${username}`;
    // Skip if Denser already has a draft for this user
    if (getStorageItem<DenserDraft>(denserKey)) return;

    const raw = localStorage.getItem('replyEditorData-submitStory');
    if (!raw) return;

    let draft: CondenserDraft;
    try {
      draft = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof draft !== 'object' || draft === null) return;

    // Only migrate if there's actual content
    if (!draft.body && !draft.title) return;

    const converted: DenserDraft = {
      title: draft.title || '',
      postArea: draft.body || '',
      postSummary: draft.summary || '',
      tags: draft.tags || '',
      author: draft.altAuthor || '',
      category: 'blog',
      beneficiaries: convertBeneficiaries(draft.beneficiaries),
      maxAcceptedPayout: convertMaxAcceptedPayout(draft.maxAcceptedPayout, draft.payoutType),
      payoutType: convertPayoutType(draft.payoutType)
    };

    setStorageItem(denserKey, converted, StorageTTL.DRAFT);
    logger.info('Condenser migration: post draft migrated for user %s', username);
  } catch (error) {
    logger.error(error, 'Condenser migration: failed to migrate draft for user %s', username);
  }
}

/**
 * Migrates reply/comment drafts from Condenser's `replyEditorData-{author}/{permlink}`
 * to Denser's `replyTo-/{author}/{permlink}-{username}`.
 *
 * Condenser stores reply drafts as JSON with a `body` field.
 * Denser stores them as plain strings (just the body text).
 *
 * Skips `replyEditorData-submitStory` (handled by `migrateDraft`) and `replyEditorData-rte` (not a draft).
 */
export function migrateReplyDrafts(username: string): void {
  try {
    const prefix = 'replyEditorData-';
    const skipKeys = new Set([`${prefix}submitStory`, `${prefix}rte`]);
    let migratedCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix) || skipKeys.has(key)) continue;

      // Extract "author/permlink" from Condenser's formId.
      // Condenser uses: "replyEditorData-postFull-{author}/{permlink}-reply"
      let authorPermlink = key.slice(prefix.length);
      if (authorPermlink.startsWith('postFull-')) {
        authorPermlink = authorPermlink.slice('postFull-'.length);
      }
      if (authorPermlink.endsWith('-reply')) {
        authorPermlink = authorPermlink.slice(0, -'-reply'.length);
      }
      if (!authorPermlink || !authorPermlink.includes('/')) continue;

      const denserKey = `replyTo-/${authorPermlink}-${username}`;

      // Skip if Denser already has a draft for this reply
      if (getStorageItem<string>(denserKey)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      let body: string | undefined;
      try {
        const parsed = JSON.parse(raw);
        body = typeof parsed === 'object' && parsed !== null ? parsed.body : undefined;
      } catch {
        // Not valid JSON — skip
        continue;
      }

      if (!body) continue;

      setStorageItem(denserKey, body, StorageTTL.DRAFT);
      migratedCount++;
    }

    if (migratedCount > 0) {
      logger.info('Condenser migration: %d reply drafts migrated for user %s', migratedCount, username);
    }
  } catch (error) {
    logger.error(error, 'Condenser migration: failed to migrate reply drafts for user %s', username);
  }
}

/**
 * Migrates vote weights from Condenser's per-user keys to Denser's unified `votesValues`.
 *
 * Condenser: `voteWeight-{user}`, `voteWeightDown-{user}`, `voteWeight-{user}-comment`, `voteWeightDown-{user}-comment`
 *   Values: 100-10000 (where 10000 = 100%)
 * Denser: `votesValues` = { post: { upvote: [1-100], downvote: [1-100] }, comment: { upvote: [1-100], downvote: [1-100] } }
 *
 * Only migrates if `votesValues` doesn't already exist.
 */
export function migrateVoteWeights(username: string): void {
  try {
    // Skip if Denser already has vote values
    if (getStorageItem('votesValues')) return;

    const postUp = localStorage.getItem(`voteWeight-${username}`);
    const postDown = localStorage.getItem(`voteWeightDown-${username}`);
    const commentUp = localStorage.getItem(`voteWeight-${username}-comment`);
    const commentDown = localStorage.getItem(`voteWeightDown-${username}-comment`);

    // Nothing to migrate
    if (!postUp && !postDown && !commentUp && !commentDown) return;

    // Convert from condenser range (100-10000) to denser range (1-100)
    const toPercent = (raw: string | null): number => {
      if (!raw) return 100;
      const val = Number(raw);
      if (isNaN(val) || val <= 0) return 100;
      return Math.max(1, Math.min(100, Math.round(val / 100)));
    };

    const votesValues = {
      post: {
        upvote: [toPercent(postUp)],
        downvote: [toPercent(postDown)]
      },
      comment: {
        upvote: [toPercent(commentUp)],
        downvote: [toPercent(commentDown)]
      }
    };

    setStorageItem('votesValues', votesValues, StorageTTL.PERMANENT);
    logger.info('Condenser migration: vote weights migrated for user %s', username);
  } catch (error) {
    logger.error(error, 'Condenser migration: failed to migrate vote weights for user %s', username);
  }
}

/**
 * Runs all data migrations that require a username.
 */
export function migrateCondenserData(username: string): void {
  migrateTemplates(username);
  migrateDraft(username);
  migrateReplyDrafts(username);
  migrateVoteWeights(username);
}

/**
 * Removes known Condenser localStorage keys that are no longer needed.
 * Includes keys from migrated data (drafts, vote weights, language).
 */
export function cleanupCondenserStorage(username?: string): void {
  const directKeys = [
    'autopost2', 'autopost', 'saveLogin', 'bump', 'replyEditorData-rte',
    'language',
    'replyEditorData-submitStory'
  ];

  for (const key of directKeys) {
    localStorage.removeItem(key);
  }

  // Remove user-specific condenser vote weight keys
  if (username) {
    localStorage.removeItem(`voteWeight-${username}`);
    localStorage.removeItem(`voteWeightDown-${username}`);
    localStorage.removeItem(`voteWeight-${username}-comment`);
    localStorage.removeItem(`voteWeightDown-${username}-comment`);
  }

  // Remove pattern-based orphan keys
  const patterns = [
    /^showEditor-/,
    /^reblogged_/,
    /^featured-post-seen:/,
    /^promoted-post-seen:/,
    /_previous_owner_authority_last_valid_time$/,
    /^replyEditorData-/,
    /^voteWeight-/,
    /^voteWeightDown-/
  ];

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && patterns.some((p) => p.test(key))) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export function isAlreadyMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

export function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}
