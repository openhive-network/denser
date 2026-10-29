export type DenserApp = 'blog' | 'wallet';

const DEFAULT_SESSION_TIME: Record<DenserApp, number> = { wallet: 900, blog: 64800 };
/** Longer values give beekeeper an expiry date it cannot represent, which locks immediately. */
const MAX_SESSION_TIME = 30 * 24 * 60 * 60;

/**
 * Resolves how long, in seconds, an unlocked safe-storage wallet stays unlocked.
 * @param configured - Raw `APP_SESSION_TIME` value; used when it is a positive number of seconds up to 30 days
 * @param app - The running app; picks the default when `configured` is unset or invalid
 * @returns `configured` as a number, else 900 for the Wallet and 64800 for the Blog
 */
export function resolveSessionTime(configured: string | undefined, app: DenserApp): number {
  const fromEnv = Number(configured);
  if (configured?.trim() && Number.isFinite(fromEnv) && fromEnv > 0 && fromEnv <= MAX_SESSION_TIME) return fromEnv;
  return DEFAULT_SESSION_TIME[app];
}
