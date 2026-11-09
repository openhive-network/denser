import { OfflineClient, type AuthStatus, type KeyAuthorityType } from '@hiveio/hb-auth';

/**
 * The digest the worker signs with the key it registers or unlocks. hb-auth's clients sign a Hive
 * transaction built for the username and check the signature against the chain; the offline client
 * accepts any signature, and its transaction only refuses a username that is no Hive account name.
 */
// sha256('lite wallet entry')
const UNCHECKED_DIGEST = '665c6447b7c78b78a85d5f49fb55a1527e1f7842597b8850310a0d127459908d';

/**
 * hb-auth's offline client for usernames that are not Hive account names: the lite accounts'
 * `did:lite:…` entries (lite-wallet-users.ts). It registers and authenticates as the offline client
 * does, through hb-auth's worker, without the Hive transaction its base class builds for the
 * username, which wax refuses to build for a DID. Signing, locking and the passkey unlock are the
 * base class's.
 */
export class LiteWalletClient extends OfflineClient {
  override async register(
    username: string,
    password: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    strict = true
  ): Promise<AuthStatus> {
    const auth = this.getAuthInstance();
    await auth.register(username, password, UNCHECKED_DIGEST, wifKey, keyType, strict);
    await auth.onAuthComplete(username, false);
    return { ok: true };
  }

  override async authenticate(username: string, password: string, keyType: KeyAuthorityType): Promise<AuthStatus> {
    const auth = this.getAuthInstance();
    await auth.authenticate(username, password, keyType, UNCHECKED_DIGEST);
    await auth.onAuthComplete(username, false);
    return { ok: true };
  }
}
