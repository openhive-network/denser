import type { CheckCredential, KeyAuthorityType, OnlineClient, PasskeyRecord } from '@hiveio/hb-auth';
import { classifyUnlockRefusal, findInCauses } from '@smart-signer/lib/wrong-safe-storage-password';
import { takeSignInCheck } from '@smart-signer/lib/signer/sign-in-check';

// The check a safe-storage wallet can ask for before every signature with its active or owner key
// (hb-auth's `requireActiveCheck`): the password typed, or a passkey asserted, for that one signature.

/** The key types whose signatures the check covers */
const CHECKED_KEY_TYPES: readonly KeyAuthorityType[] = ['active', 'owner'];

/** Shown in the check prompt when hb-auth refused the password typed */
const WRONG_PASSWORD_KEY = 'broadcast_error.wrong_safe_storage_password';
/** Shown in the check prompt when the passkey gave no check */
const PASSKEY_CHECK_FAILED_KEY = 'password_form.passkey_check_failed';

/** What the check needs of hb-auth's client */
export type ActiveCheckClient = Pick<
  OnlineClient,
  | 'sign'
  | 'signWithCheck'
  | 'checkCredential'
  | 'getRequireActiveCheck'
  | 'getRegisteredUserByUsername'
  | 'hasPasskey'
  | 'loadPasskey'
>;

/** What the check prompt offers the user, each closing it on null, or keeping it open with the smart-signer translation key it resolves with */
export interface CheckPrompt {
  /** Checks with the password typed */
  validatePassword: (password: string) => Promise<string | null>;
  /** Checks with the user's passkey, to be called first thing in the click of the prompt's button; absent without a passkey */
  checkPasskey?: () => Promise<string | null>;
}

/** The signer of one user, as the check needs it */
export interface ActiveCheckSigner {
  client: ActiveCheckClient;
  username: string;
  /** Opens the check prompt; rejects when the user closes it */
  ask: (prompt: CheckPrompt) => Promise<unknown>;
  /** Asks for the `keyType` key and stores it in safe storage with `password` */
  storeKey: (keyType: KeyAuthorityType, password: string) => Promise<void>;
}

export const isCheckedKeyType = (keyType: KeyAuthorityType): boolean => CHECKED_KEY_TYPES.includes(keyType);

/** Whether `error` is, or was caused by, hb-auth's CheckRequiredError, which Comlink rebuilds as a plain Error carrying the name */
export function isCheckRequired(error: unknown): boolean {
  return findInCauses(error, (candidate) => candidate.name === 'CheckRequiredError') !== undefined;
}

/** Whether a signature of `username` with the `keyType` key needs the check */
export async function needsActiveCheck(
  client: Pick<OnlineClient, 'getRequireActiveCheck'>,
  username: string,
  keyType: KeyAuthorityType
): Promise<boolean> {
  return isCheckedKeyType(keyType) && (await client.getRequireActiveCheck(username));
}

async function offeredPasskey(client: ActiveCheckClient, username: string): Promise<PasskeyRecord | undefined> {
  if (!(await client.hasPasskey(username))) return undefined;
  return client.loadPasskey(username).catch(() => undefined);
}

/** The translation key keeping the prompt open after `error` of a check with `credential`; undefined to close it */
async function retryKey(
  client: ActiveCheckClient,
  username: string,
  credential: CheckCredential,
  error: unknown
): Promise<string | undefined> {
  if ('passkey' in credential) {
    const passkeyFailed = findInCauses(error, (candidate) => candidate.name === 'PasskeyError');
    const refused = await classifyUnlockRefusal(error, async () => true);
    return passkeyFailed || refused === 'wrong-password' ? PASSKEY_CHECK_FAILED_KEY : undefined;
  }
  const refusal = await classifyUnlockRefusal(
    error,
    async () => (await client.getRegisteredUserByUsername(username)) !== null
  );
  return refusal === 'wrong-password' ? WRONG_PASSWORD_KEY : undefined;
}

/**
 * What `withCheck` resolves with, given a check `signer`'s user makes in the prompt it opens: the safe
 * storage password typed, or, when `offerPasskey` and the user has one, the passkey asserted from
 * the prompt's button. A wrong password or a failed passkey keeps the prompt open; any other
 * failure of `withCheck` closes it and is rethrown. Nothing is kept for a later check.
 *
 * @throws what `signer.ask` rejects with when the user closes the prompt
 */
export async function withPromptedCheck<T>(
  signer: Pick<ActiveCheckSigner, 'client' | 'username' | 'ask'>,
  withCheck: (credential: CheckCredential) => Promise<T>,
  offerPasskey = true
): Promise<T> {
  const { client, username, ask } = signer;
  const passkey = offerPasskey ? await offeredPasskey(client, username) : undefined;
  let outcome: { value: T } | { error: unknown } | undefined;
  const attempt = async (credential: CheckCredential): Promise<string | null> => {
    try {
      outcome = { value: await withCheck(credential) };
      return null;
    } catch (error) {
      const key = await retryKey(client, username, credential, error);
      if (key) return key;
      outcome = { error };
      return null;
    }
  };
  await ask({
    validatePassword: (password) => attempt({ password }),
    ...(passkey ? { checkPasskey: () => attempt({ passkey }) } : {})
  });
  if (!outcome) throw new Error('No check from user');
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}

/**
 * Signs `digest` with the `keyType` key of `signer`'s user through hb-auth's check-and-sign call:
 * with `credential`, or else the one the sign-in just gave for that key, or else one the user gives
 * in a prompt. A key safe storage does not hold yet is asked for and stored with the password the
 * credential or the prompt gave, which also signs: one prompt for the password, then one for the
 * key, and no passkey.
 */
export async function signWithActiveCheck(
  signer: ActiveCheckSigner,
  digest: string,
  keyType: KeyAuthorityType,
  credential?: CheckCredential
): Promise<string> {
  const { client, username } = signer;
  const given = credential ?? takeSignInCheck(username, keyType);
  const stored = (await client.getRegisteredUserByUsername(username))?.registeredKeyTypes ?? [];
  if (stored.includes(keyType)) {
    if (given) return client.signWithCheck(username, digest, keyType, given);
    return withPromptedCheck(signer, (prompted) => client.signWithCheck(username, digest, keyType, prompted));
  }
  const password =
    given && 'password' in given
      ? given.password
      : await withPromptedCheck(
          signer,
          async (prompted) => {
            await client.checkCredential(username, prompted);
            return 'password' in prompted ? prompted.password : '';
          },
          false
        );
  await signer.storeKey(keyType, password);
  return client.signWithCheck(username, digest, keyType, { password });
}

/**
 * Signs `digest` with the `keyType` key of `signer`'s user as the wallet's setting of the check asks.
 * `unlock` unlocks a locked wallet, with one prompt, and resolves with the password it took; with
 * undefined when the wallet was unlocked already. hb-auth verifies the setting only in an unlocked
 * wallet: a locked one reads unverified, and as on for a wallet from before the setting until an
 * unlock adopts it as off. So a locked wallet reading on is unlocked first and the setting read
 * again: on, the check signs with the password the unlock took, off, the signature is what
 * `signUnlocked` resolves with, given that password. One prompt either way.
 */
export async function signAsSettingAsks(
  signer: ActiveCheckSigner,
  digest: string,
  keyType: KeyAuthorityType,
  unlock: () => Promise<string | undefined>,
  signUnlocked: (password: string | undefined) => Promise<string>
): Promise<string> {
  const { client, username } = signer;
  const readOn = await needsActiveCheck(client, username, keyType);
  const password = await unlock();
  if (!readOn) return signUnlocked(password);
  if (password === undefined) return signWithActiveCheck(signer, digest, keyType);
  if (await needsActiveCheck(client, username, keyType)) {
    return signWithActiveCheck(signer, digest, keyType, { password });
  }
  return signUnlocked(password);
}

/**
 * What `sign` resolves with, or, when it throws hb-auth's CheckRequiredError for the `keyType` key
 * (the setting was turned on in another tab since it was read), the signature `signWithActiveCheck`
 * gives.
 */
export async function signOrCheck(
  signer: ActiveCheckSigner,
  digest: string,
  keyType: KeyAuthorityType,
  sign: () => Promise<string>
): Promise<string> {
  try {
    return await sign();
  } catch (error) {
    if (!isCheckedKeyType(keyType) || !isCheckRequired(error)) throw error;
    return signWithActiveCheck(signer, digest, keyType);
  }
}
