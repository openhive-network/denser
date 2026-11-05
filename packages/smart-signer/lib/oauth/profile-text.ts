import type { HiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';

const DISPLAY_NAME_MAX_LENGTH = 100;

/** Strip HTML tags and limit length for plain-text profile fields. */
export function sanitizeProfileText(value: string | undefined, maxLen = 160): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, '').slice(0, maxLen).trim() || undefined;
}

/** The display name a Hive profile names, as plain text; undefined when it names none */
export function profileDisplayName(profile: HiveUserProfile): string | undefined {
  return sanitizeProfileText(profile.name, DISPLAY_NAME_MAX_LENGTH);
}

/** The `name` userinfo gives a Hive account: its profile's name, else the account name. */
export function oauthDisplayName(profile: HiveUserProfile, username: string): string {
  return profileDisplayName(profile) || username;
}
