/** An account authority as the chain's API returns it: `key_auths` are `[public key, weight]` pairs. */
export type KeyAuthority = {
  weight_threshold: number;
  key_auths: ReadonlyArray<{ 0: string; 1: number }>;
};

/**
 * The first of `derivedKeys` (what the passkey signer derives) that signs for `authority` on its
 * own: a key member whose weight meets the threshold. Null when none does, so the signer cannot
 * sign for the account.
 */
export function matchPostingKey(authority: KeyAuthority, derivedKeys: readonly string[]): string | null {
  const signsAlone = (key: string) =>
    authority.key_auths.some((member) => member[0] === key && member[1] >= authority.weight_threshold);
  return derivedKeys.find(signsAlone) ?? null;
}
