import type { AccountProfile } from '@hive/common-hiveio-packages/wax';
import { isJsonObject, parseJsonObject, type JsonObject } from './json-object';

/**
 * Profile fields written by the profile settings form. `social` lists the platform keys the
 * caller manages: a non-empty handle sets the key, an empty string removes it.
 */
export interface ProfileMetadataUpdate {
  profile_image?: string;
  cover_image?: string;
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  witness_owner?: string;
  witness_description?: string;
  blacklist_description?: string;
  muted_list_description?: string;
  social?: Partial<Record<string, string>>;
  version: number;
}

// Keys this update owns: an absent value removes the key instead of keeping the old one.
const MANAGED_PROFILE_KEYS: ReadonlyArray<keyof ProfileMetadataUpdate> = [
  'profile_image',
  'cover_image',
  'name',
  'about',
  'location',
  'website',
  'witness_owner',
  'witness_description',
  'blacklist_description',
  'muted_list_description',
  'version'
];

const hasHandle = (value: string | undefined): value is string => value !== undefined && value !== '';

/**
 * `current` social with the update's keys applied one by one; other keys are kept whatever
 * their type. A non-object `current` is replaced only when the update sets a handle.
 */
function mergeSocial(current: unknown, update: ProfileMetadataUpdate['social']): unknown {
  if (update === undefined) return current;
  const entries = Object.entries(update);
  if (!isJsonObject(current) && current !== undefined && !entries.some(([, value]) => hasHandle(value))) {
    return current;
  }
  const social: JsonObject = isJsonObject(current) ? { ...current } : {};
  for (const [key, value] of entries) {
    if (hasHandle(value)) social[key] = value;
    else delete social[key];
  }
  return Object.keys(social).length > 0 ? social : undefined;
}

/**
 * Returns the `posting_json_metadata` string to broadcast: `current` with `update`
 * applied to its `profile`. Keys other frontends set, top-level, inside `profile` or inside
 * `profile.social`, are kept; managed keys that are undefined in `update` are removed, and so
 * is `social` once it holds no key. Unparseable `current` metadata is treated as empty.
 */
export function mergePostingJsonMetadata(current: string | undefined, update: ProfileMetadataUpdate): string {
  const metadata = parseJsonObject(current);
  const profile: JsonObject = isJsonObject(metadata.profile) ? { ...metadata.profile } : {};
  for (const key of MANAGED_PROFILE_KEYS) {
    delete profile[key];
    const value = update[key];
    if (value !== undefined) profile[key] = value;
  }
  const social = mergeSocial(profile.social, update.social);
  if (social === undefined) delete profile.social;
  else profile.social = social;
  return JSON.stringify({ ...metadata, profile });
}

const ACCOUNT_PROFILE_KEYS: ReadonlyArray<keyof AccountProfile> = [
  'about',
  'cover_image',
  'location',
  'blacklist_description',
  'muted_list_description',
  'name',
  'profile_image',
  'website',
  'pinned',
  'witness_description',
  'witness_owner'
];

/**
 * The account's profile from `posting_json_metadata`, falling back to `json_metadata` when the
 * former has no profile object. Only string values of the `AccountProfile` fields are kept, so a
 * field set to a number, boolean, object or array by another frontend reads as absent. With no
 * profile in either, the text fields are empty strings.
 */
export function readAccountProfile(postingJsonMetadata: string | undefined, jsonMetadata: string | undefined): AccountProfile {
  const postingProfile = parseJsonObject(postingJsonMetadata).profile;
  const source = isJsonObject(postingProfile) ? postingProfile : parseJsonObject(jsonMetadata).profile;
  if (!isJsonObject(source)) {
    return { about: '', cover_image: '', location: '', name: '', profile_image: '', website: '' };
  }
  const profile: AccountProfile = {};
  for (const key of ACCOUNT_PROFILE_KEYS) {
    const value = source[key];
    if (typeof value === 'string') profile[key] = value;
  }
  return profile;
}
