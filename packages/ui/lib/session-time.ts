const WALLET_SESSION_TIME = 900;
const BLOG_SESSION_TIME = 64800;

/**
 * Resolves how long, in seconds, an unlocked safe-storage wallet stays unlocked.
 * @param configured - Raw `APP_SESSION_TIME` value; used when it is a positive number of seconds
 * @param siteDomain - Configured site domain; picks the default when `configured` is unset or invalid
 * @returns `configured` as a number, else 900 for a Wallet domain and 64800 for any other
 */
export function resolveSessionTime(configured: string | undefined, siteDomain: string): number {
  const fromEnv = Number(configured);
  if (configured?.trim() && Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return siteDomain.includes('wallet') ? WALLET_SESSION_TIME : BLOG_SESSION_TIME;
}
