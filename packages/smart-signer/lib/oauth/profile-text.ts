import type { HiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';

const DISPLAY_NAME_MAX_LENGTH = 100;
/** C0 and C1 controls, and the bidi marks, embeddings, overrides and isolates */
const CONTROL_AND_BIDI = /[\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;

/**
 * Strip HTML tags and limit length for plain-text profile fields. Profiles are free-form JSON on
 * chain, so a value that is not a string counts as none.
 */
export function sanitizeProfileText(value: unknown, maxLen = 160): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  return value.replace(/<[^>]*>/g, '').slice(0, maxLen).trim() || undefined;
}

/**
 * The display name a Hive profile names, as plain text without control or bidi characters;
 * undefined when it names none
 */
export function profileDisplayName(profile: HiveUserProfile): string | undefined {
  const name = sanitizeProfileText(profile.name, DISPLAY_NAME_MAX_LENGTH);
  return name?.replace(CONTROL_AND_BIDI, '').trim() || undefined;
}

/** The `name` userinfo gives a Hive account: its profile's name, else the account name. */
export function oauthDisplayName(profile: HiveUserProfile, username: string): string {
  return profileDisplayName(profile) || username;
}
