import type { LiteGraduationView } from '@hiveio/lite-account';

// No runtime import of @hiveio/lite-account: the identity menu and the profile read these.

/**
 * What the identity menu and the profile offer, from the gateway's graduation read: `eligible`
 * (the upgrade, with the ledger amount and the threshold, if any), `progress` (below the threshold:
 * shown disabled, `percent` of the way), `linked` (graduated to `account`), or `none` (the policy
 * says no and there is no progress to show, e.g. not on an allow-list).
 */
export type GraduationOffer =
  | { kind: 'eligible'; rewards: number; threshold: number | null }
  | { kind: 'progress'; rewards: number; threshold: number; percent: number }
  | { kind: 'linked'; account: string }
  | { kind: 'none' };

export function graduationOffer(view: LiteGraduationView): GraduationOffer {
  if (view.linked_account) return { kind: 'linked', account: view.linked_account };
  const rewards = view.rewards_hbd;
  const threshold = view.threshold_hbd;
  if (view.eligible) return { kind: 'eligible', rewards, threshold };
  if (threshold === null || threshold <= 0) return { kind: 'none' };
  const percent = Math.min(99, Math.max(0, Math.floor((rewards / threshold) * 100)));
  return { kind: 'progress', rewards, threshold, percent };
}

/** An HBD amount as the ledger shows it: three decimals. */
export const formatHbd = (amount: number): string => amount.toFixed(3);

type Translate = (key: string, options: Record<string, string | number>) => string;

/** How far an offer's account is, as the menu and the profile say it: the ledger amount, the threshold and the progress. */
export function graduationAmount(t: Translate, offer: Extract<GraduationOffer, { kind: 'eligible' | 'progress' }>): string {
  const rewards = formatHbd(offer.rewards);
  if (offer.kind === 'progress') {
    return t('lite_account.graduation.progress', { rewards, threshold: formatHbd(offer.threshold), percent: offer.percent });
  }
  return offer.threshold === null
    ? t('lite_account.graduation.earned', { rewards })
    : t('lite_account.graduation.reached', { rewards, threshold: formatHbd(offer.threshold) });
}

/** The `POST /graduate` refusals and the flow's own failures the dialog names; any other is `unavailable`. */
const GRADUATION_ERRORS = new Set([
  'not_eligible',
  'name_taken',
  'name_invalid',
  'daily_cap',
  'graduation_disabled',
  'creator_balance',
  'rate_limited',
  'auth_failed',
  'broadcast_failed',
  'signer_keys'
]);

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;

/** The `lite_account.graduation.errors.*` key of a failed graduation or link step (not a signer failure). */
export function graduationErrorKey(error: unknown): string {
  const code = errorCode(error);
  return `lite_account.graduation.errors.${code && GRADUATION_ERRORS.has(code) ? code : 'unavailable'}`;
}
