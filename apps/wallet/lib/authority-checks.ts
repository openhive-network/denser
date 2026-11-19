/** A key or account of an authority role, with its weight */
export interface WeightedAuth {
  keyOrAccount: string;
  thresholdWeight: number;
}

/** One of an account's owner, active and posting authorities */
export interface RoleAuthority {
  level: string;
  key_auths: readonly WeightedAuth[];
  account_auths: readonly WeightedAuth[];
  weight_threshold: number;
}

/**
 * The keys a signer signs with: the public keys known exactly, and the roles it signs for whose key
 * is not known (as safe storage tells only which roles it holds a key of).
 */
export interface SigningKeys {
  publicKeys: readonly string[];
  roles: readonly string[];
}

export const NO_SIGNING_KEYS: SigningKeys = { publicKeys: [], roles: [] };

/**
 * The public keys of `authorities` that `signing` signs with: those it knows, and the only key of a
 * role it signs for without knowing the key. A role with several keys and none known marks none.
 */
export function signingKeysIn(authorities: readonly RoleAuthority[], signing: SigningKeys): Set<string> {
  const marked = new Set<string>();
  for (const { level, key_auths: keyAuths } of authorities) {
    const keys = keyAuths.map(({ keyOrAccount }) => keyOrAccount);
    const known = keys.filter((key) => signing.publicKeys.includes(key));
    known.forEach((key) => marked.add(key));
    if (!known.length && signing.roles.includes(level) && keys.length === 1) marked.add(keys[0]);
  }
  return marked;
}

export type AuthorityProblem =
  | { kind: 'unreachable_threshold'; level: string; threshold: number; total: number }
  | { kind: 'owner_empty'; level: string };

/**
 * Why `authorities` cannot be submitted: a role whose threshold its keys' and accounts' weights
 * cannot reach together, and an owner role left with no key or account.
 */
export function authorityProblems(authorities: readonly RoleAuthority[]): AuthorityProblem[] {
  const problems: AuthorityProblem[] = [];
  for (const role of authorities) {
    const { level } = role;
    const auths = [...role.key_auths, ...role.account_auths];
    if (level === 'owner' && !auths.length) {
      problems.push({ kind: 'owner_empty', level });
      continue;
    }
    const total = auths.reduce((sum, { thresholdWeight }) => sum + thresholdWeight, 0);
    const threshold = role.weight_threshold;
    if (total < threshold) problems.push({ kind: 'unreachable_threshold', level, threshold, total });
  }
  return problems;
}

/** The keys each role of `before` holds that the same role of `after` no longer does. */
export function removedKeys(
  before: readonly RoleAuthority[],
  after: readonly RoleAuthority[]
): { level: string; key: string }[] {
  return before.flatMap(({ level, key_auths: keyAuths }) => {
    const kept = new Set(after.find((role) => role.level === level)?.key_auths.map(({ keyOrAccount }) => keyOrAccount));
    return keyAuths.filter(({ keyOrAccount }) => !kept.has(keyOrAccount)).map(({ keyOrAccount }) => ({ level, key: keyOrAccount }));
  });
}

/**
 * How a change of the authorities can lock the user out:
 * - `session_key`: it removes or replaces a key this session signs with
 * - `passkey_key`: it removes or replaces the posting key the passkey signer derives
 * - `wallet_keys`: it removes or replaces a key while the session signs with a wallet outside this
 *   app, which may hold it
 * - `owner_threshold`: it raises the owner threshold above 1, so no single owner key or account
 *   can act for the account alone
 */
export type LockoutRisk = 'session_key' | 'passkey_key' | 'wallet_keys' | 'owner_threshold';

export interface LockoutInput {
  before: readonly RoleAuthority[];
  after: readonly RoleAuthority[];
  sessionKeys: ReadonlySet<string>;
  passkeyKeys: ReadonlySet<string>;
  /** Whether the session signs with an external wallet, a HiveAuth app or the Google Drive wallet */
  externalWallet: boolean;
}

export function lockoutRisks({ before, after, sessionKeys, passkeyKeys, externalWallet }: LockoutInput): LockoutRisk[] {
  const removed = removedKeys(before, after).map(({ key }) => key);
  const risks: LockoutRisk[] = [];
  if (removed.some((key) => sessionKeys.has(key))) risks.push('session_key');
  if (removed.some((key) => passkeyKeys.has(key))) risks.push('passkey_key');
  if (externalWallet && removed.length) risks.push('wallet_keys');
  const ownerThreshold = (roles: readonly RoleAuthority[]) => roles.find(({ level }) => level === 'owner')?.weight_threshold;
  const threshold = ownerThreshold(after);
  if (threshold !== undefined && threshold > 1 && threshold !== ownerThreshold(before)) risks.push('owner_threshold');
  return risks;
}

/** The roles of which a key `held` marks is removed from that role by the change. */
export function rolesLosingKeys(
  before: readonly RoleAuthority[],
  after: readonly RoleAuthority[],
  held: ReadonlySet<string>
): string[] {
  const roles = removedKeys(before, after)
    .filter(({ key }) => held.has(key))
    .map(({ level }) => level);
  return [...new Set(roles)];
}
