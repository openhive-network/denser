import type { HiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';

const DISPLAY_NAME_MAX_LENGTH = 100;

/** Strip HTML tags and limit length for plain-text profile fields. */
export function sanitizeProfileText(value: string | undefined, maxLen = 160): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, '').slice(0, maxLen).trim() || undefined;
}

/** The `name` userinfo gives a Hive account: its profile's name, else the account name. */
export function oauthDisplayName(profile: HiveUserProfile, username: string): string {
  return sanitizeProfileText(profile.name, DISPLAY_NAME_MAX_LENGTH) || username;
}
