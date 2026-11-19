import CryptoJS from 'crypto-js';
import { HasClient } from 'hive-auth-client';

type AuthData = Parameters<HasClient['broadcast']>[0];
type ChallengeData = Parameters<HasClient['challenge']>[1];

const REQUIRED_AUTH_DATA = [
  ['username', 'string'],
  ['token', 'string'],
  ['key', 'string']
];

/**
 * `HasClient` whose sign and challenge requests carry a `nonce`, as HAS protocol 1.0 has them:
 * wallet apps (Hive Keychain Mobile) drop a request whose nonce they saw before, and hive-auth-client
 * 0.1.5 sends none, so every request after the first would go unanswered.
 */
export class NoncedHasClient extends HasClient {
  private lastNonce = 0;

  /** Sends a sign request, which the wallet app signs and broadcasts (`sign_req`) */
  broadcast(authData: AuthData, keyType: string, ops: unknown[]): void {
    this.assert(authData, 'authData', REQUIRED_AUTH_DATA);
    this.assert(ops, 'ops', []);
    this.sendRequest('sign_req', authData, { key_type: keyType, ops, broadcast: true, nonce: this.nextNonce() });
  }

  /** Sends a challenge request (`challenge_req`) */
  challenge(authData: AuthData, challengeData: ChallengeData): void {
    this.assert(authData, 'authData', REQUIRED_AUTH_DATA);
    this.assert(challengeData, 'challengeData', [
      ['key_type', 'string'],
      ['challenge', 'string']
    ]);
    this.sendRequest('challenge_req', authData, { ...challengeData, nonce: this.nextNonce() });
  }

  /** The current time in ms, past every nonce sent before */
  private nextNonce(): number {
    this.lastNonce = Math.max(Date.now(), this.lastNonce + 1);
    return this.lastNonce;
  }

  /** Sends `data` encrypted with the session's key, as `HasClient` sends its requests */
  private sendRequest(cmd: string, { username, token, key }: AuthData, data: object): void {
    if (!key) throw new Error('authData.key is missing');
    this.authKey = key;
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    this.send(JSON.stringify({ cmd, account: username, token, data: encrypted })).catch((error: unknown) =>
      this.dispatchEvent('Error', { message: error instanceof Error ? error.message : String(error) })
    );
    this.currentRequestExpire = Date.now() + this.timeout;
    this.setExpireTimeout();
  }
}
