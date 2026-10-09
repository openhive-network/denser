/** Profile fields written by the profile settings form; `social` holds sparse handles by platform key. */
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
  'social',
  'version'
];

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(raw: string | undefined): JsonObject {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Returns the `posting_json_metadata` string to broadcast: `current` with `update`
 * applied to its `profile`. Keys other frontends set, top-level or inside `profile`,
 * are kept; managed keys that are undefined in `update` (and an empty `social`) are
 * removed. Unparseable `current` metadata is treated as empty.
 */
export function mergePostingJsonMetadata(current: string | undefined, update: ProfileMetadataUpdate): string {
  const metadata = parseJsonObject(current);
  const profile: JsonObject = isJsonObject(metadata.profile) ? { ...metadata.profile } : {};
  for (const key of MANAGED_PROFILE_KEYS) {
    delete profile[key];
    const value = update[key];
    if (value === undefined) continue;
    if (key === 'social' && isJsonObject(value) && Object.keys(value).length === 0) continue;
    profile[key] = value;
  }
  return JSON.stringify({ ...metadata, profile });
}
