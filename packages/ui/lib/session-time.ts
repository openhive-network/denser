/** The idle time a safe-storage session locks after when the deployment configures none */
const DEFAULT_SESSION_TIME = 15 * 60;
/** The longest idle time the user may choose when the deployment configures no maximum */
const DEFAULT_MAX_SESSION_TIME = 8 * 60 * 60;
/** Longer values give beekeeper an expiry date it cannot represent, which locks immediately. */
const MAX_SESSION_TIME = 30 * 24 * 60 * 60;
/** The idle times, besides the deployment's own, the user picks from */
const SESSION_TIME_PRESETS = [5 * 60, 15 * 60, 60 * 60, 8 * 60 * 60];

/** A deployment's safe-storage idle lock, in seconds */
export interface SessionTimeConfig {
  /** Used until the user chooses another; never above `max` */
  deployment: number;
  /** The longest idle time the user may choose */
  max: number;
}

function parseSeconds(configured: string | undefined): number | undefined {
  const seconds = Number(configured);
  if (configured?.trim() && Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_SESSION_TIME) return seconds;
  return undefined;
}

/**
 * Resolves a deployment's safe-storage idle lock, the same for every app of it.
 * @param configured - Raw `APP_SESSION_TIME`, in seconds; 900 when unset or not a positive number up to 30 days
 * @param configuredMax - Raw `APP_SESSION_TIME_MAX`, in seconds, likewise; when unset, 8 hours or the
 *   deployment's value when that is longer
 * @returns The deployment's value, capped at the maximum, and the maximum
 */
export function resolveSessionTimeConfig(
  configured: string | undefined,
  configuredMax: string | undefined
): SessionTimeConfig {
  const deployment = parseSeconds(configured) ?? DEFAULT_SESSION_TIME;
  const max = parseSeconds(configuredMax) ?? Math.max(DEFAULT_MAX_SESSION_TIME, deployment);
  return { deployment: Math.min(deployment, max), max };
}

/** The idle times, in seconds and ascending, the user may choose: the presets and the deployment's value, up to the maximum */
export function sessionTimeChoices({ deployment, max }: SessionTimeConfig): number[] {
  return [...new Set([...SESSION_TIME_PRESETS, deployment])].filter((seconds) => seconds <= max).sort((a, b) => a - b);
}

/** The idle time, in seconds, a session locks after: `chosen` when it is one of the choices, else the deployment's */
export function resolveChosenSessionTime(config: SessionTimeConfig, chosen: unknown): number {
  if (typeof chosen === 'number' && sessionTimeChoices(config).includes(chosen)) return chosen;
  return config.deployment;
}
