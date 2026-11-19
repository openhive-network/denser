import type { LoginType, User } from '@smart-signer/types/common';

/** Whether the account page of `username` is the signed-in user's own one. */
export function isOwnAccount({ isLoggedIn, username: signedIn }: Pick<User, 'isLoggedIn' | 'username'>, username: string) {
  return isLoggedIn && signedIn === username;
}

/**
 * Where the keys a session signs with live, which decides what an account-key page can show of them
 * and what has to follow a change of them:
 * - `wif`: a key typed in, held by this tab
 * - `safe_storage`: keys encrypted in this browser (hb-auth)
 * - `external_wallet`: a browser extension that holds the keys (Keychain, PeakVault, MetaMask)
 * - `hiveauth`: the HiveAuth wallet app on another device
 * - `google`: the Google Drive wallet, managed in Hive Bridge
 * - `passkey`: a posting key derived from a passkey by the passkey signer
 */
export type LoginMethod = 'wif' | 'safe_storage' | 'external_wallet' | 'hiveauth' | 'google' | 'passkey';

// Values of LoginType: the enum cannot load under type stripping
const LOGIN_METHODS: Record<`${LoginType}`, LoginMethod> = {
  wif: 'wif',
  hbauth: 'safe_storage',
  keychain: 'external_wallet',
  peakvault: 'external_wallet',
  metamask: 'external_wallet',
  hiveauth: 'hiveauth',
  google: 'google',
  passkey: 'passkey'
};

export function loginMethodOf(loginType: `${LoginType}`): LoginMethod {
  return LOGIN_METHODS[loginType];
}

/**
 * What the user has to do about the keys `loginType`'s signer holds once the account's keys
 * change: `update_wallet` in the external wallet or HiveAuth app, `update_google_drive` in Hive
 * Bridge, `passkey_lost` as the passkey's posting key cannot be put back, `safe_storage_replaced`
 * as the app replaces the stored keys itself, and `none` for a key typed in.
 */
export type KeyChangeFollowUp =
  | 'update_wallet'
  | 'update_google_drive'
  | 'passkey_lost'
  | 'safe_storage_replaced'
  | 'none';

const FOLLOW_UPS: Record<LoginMethod, KeyChangeFollowUp> = {
  wif: 'none',
  safe_storage: 'safe_storage_replaced',
  external_wallet: 'update_wallet',
  hiveauth: 'update_wallet',
  google: 'update_google_drive',
  passkey: 'passkey_lost'
};

export function keyChangeFollowUp(loginType: `${LoginType}`): KeyChangeFollowUp {
  return FOLLOW_UPS[loginMethodOf(loginType)];
}

/** Whether the user still has to update a wallet outside this app after `followUp`. */
export function needsWalletUpdate(followUp: KeyChangeFollowUp): boolean {
  return followUp === 'update_wallet' || followUp === 'update_google_drive';
}
