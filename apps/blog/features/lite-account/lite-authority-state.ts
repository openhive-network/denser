import type { AuthorityKeyMemberView, AuthorityMemberView, LiteAuthorityView } from '@hiveio/lite-account';
import type { LiteRelayInfo } from './lite-relay-info-query.ts';

// No runtime import of @hiveio/lite-account: the header reads these on every page.

export const UPDATE_AUTHORITY_METHOD = 'update_authority';
/** How long a device's posting key counts before it must be renewed with the passkey. */
export const DEVICE_LIFETIME_DAYS = 90;
/** How close to its expiry a device key is offered renewal and the expiry banner shows. */
export const RENEW_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

/** The lite_account method that records the Hive account a lite account graduated to. */
export const LINK_METHOD = 'link';

/** Whether the deployment's gateway relays the lite_account `method`: its `/info.limits.l2.apps[<account app id>]` lists it. */
function relaysAccountMethod(info: LiteRelayInfo | undefined, method: string): boolean {
  if (!info?.enabled) return false;
  const methods = info.limits?.l2?.apps?.[info.apps.account];
  return Array.isArray(methods) && methods.includes(method);
}

/** Whether the gateway relays `lite_account.update_authority`. Without it no passkey UI is shown. */
export const relaysUpdateAuthority = (info: LiteRelayInfo | undefined): boolean =>
  relaysAccountMethod(info, UPDATE_AUTHORITY_METHOD);

/**
 * Whether the gateway graduates lite accounts: it relays `link`, which `POST /graduate` relays and a
 * failed link is retried with. Without it no graduation UI is shown.
 */
export const relaysLink = (info: LiteRelayInfo | undefined): boolean => relaysAccountMethod(info, LINK_METHOD);

/** A chain time (UTC, seconds, no zone) as epoch milliseconds. */
export const chainTimeMs = (time: string): number => Date.parse(`${time}Z`);

/** The chain time `days` after `nowMs`, in the `expires` format. */
export const chainTimeAfterDays = (days: number, nowMs: number): string =>
  new Date(nowMs + days * DAY_MS).toISOString().slice(0, 19);

/** Whether `expires` falls within the renewal window from `nowMs` (an expired key too). */
export const expiresSoon = (expires: string | null | undefined, nowMs: number): boolean =>
  !!expires && chainTimeMs(expires) - nowMs <= RENEW_WINDOW_DAYS * DAY_MS;

const isKeyMember = (member: AuthorityMemberView): member is AuthorityKeyMemberView => !('account' in member);
/** The key members (not account members) of `view`'s `role`. */
export const keyMembers = (view: LiteAuthorityView, role: string): AuthorityKeyMemberView[] =>
  (Object.hasOwn(view.roles, role) ? view.roles[role].members : []).filter(isKeyMember);

/** A member's `meta.label` or `meta.signer`, when it is a non-empty string. */
export const metaText = (member: AuthorityKeyMemberView, field: 'label' | 'signer'): string | undefined => {
  const value = member.meta?.[field];
  return typeof value === 'string' && value ? value : undefined;
};

/**
 * The account's passkey root: its first active owner member marked `kind: passkey`, with its signer
 * origin and label where recorded.
 */
export function passkeyRoot(
  view: LiteAuthorityView
): { key: string; signer?: string; label?: string } | null {
  const root = keyMembers(view, 'owner').find((member) => member.active && member.meta?.kind === 'passkey');
  if (!root) return null;
  const signer = metaText(root, 'signer');
  const label = metaText(root, 'label');
  return { key: root.value, ...(signer ? { signer } : {}), ...(label ? { label } : {}) };
}

export type SecurityWarning = 'unsecured' | 'add_backup';
/** A security warning, with the label of the passkey that secures the account when it has one. */
export type SecurityNotice = { warning: SecurityWarning; passkeyLabel?: string };

/**
 * What the account's owner authority warrants telling its holder: `unsecured` while no owner member
 * is a passkey (the browser's key is all there is), `add_backup` with a single passkey and no backup
 * member, nothing otherwise.
 */
export function securityWarning(view: LiteAuthorityView): SecurityWarning | null {
  const owners = keyMembers(view, 'owner').filter((member) => member.active);
  const passkeys = owners.filter((member) => member.meta?.kind === 'passkey').length;
  if (passkeys === 0) return 'unsecured';
  return passkeys === 1 && !owners.some((member) => member.meta?.kind === 'backup') ? 'add_backup' : null;
}

export type DeviceRow = {
  key: string;
  label?: string;
  expires: string | null;
  effectiveUntil: string | null;
  active: boolean;
  /** This browser's posting key. */
  current: boolean;
  /** This browser's key within the renewal window: Renew is offered. */
  renewable: boolean;
};

/** The posting key members of the account, as the Devices tab lists them; `currentKey` is this browser's. */
export function postingDevices(view: LiteAuthorityView, currentKey: string, nowMs: number): DeviceRow[] {
  return keyMembers(view, 'posting').map((member) => {
    const current = member.value === currentKey;
    return {
      key: member.value,
      label: typeof member.meta?.label === 'string' && member.meta.label ? member.meta.label : undefined,
      expires: member.expires,
      effectiveUntil: member.effective_until,
      active: member.active,
      current,
      renewable: current && expiresSoon(member.expires, nowMs)
    };
  });
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari']
];
const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux']
];

const firstMatch = (table: [RegExp, string][], text: string): string | undefined =>
  table.find(([pattern]) => pattern.test(text))?.[1];

/** A device label guessed from the user agent (`Chrome · macOS`); the user can edit it. Empty when nothing is recognised. */
export function deviceLabelGuess(userAgent: string): string {
  return [firstMatch(BROWSERS, userAgent), firstMatch(SYSTEMS, userAgent)].filter(Boolean).join(' · ');
}

/** A chain time as a date in `locale` (`Oct 23, 2026`). */
export const formatChainDate = (time: string, locale: string): string =>
  new Date(chainTimeMs(time)).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
