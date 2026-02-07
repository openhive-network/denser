/**
 * Hivemind community name regex.
 * Matches: hive-[123]DDDD to hive-[123]DDDDDD (5-7 digits after prefix,
 * first digit must be 1, 2, or 3).
 *
 * Source: hivemind/hive/db/sql_scripts/postgrest/utilities/check_community.sql
 */
const COMMUNITY_REGEX = /^hive-[123]\d{4,6}$/;

/**
 * Checks if string matches community name format.
 * Replaces the buggy isCommunity() in packages/ui/lib/utils.ts which
 * only accepted exactly 6 digits and any first digit.
 */
export function isCommunityFormat(value: string | undefined | null): boolean {
  if (!value) return false;
  return COMMUNITY_REGEX.test(value);
}
