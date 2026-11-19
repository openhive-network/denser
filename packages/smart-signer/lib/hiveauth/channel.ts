import type { HasClient } from 'hive-auth-client';
import { HiveAuthError } from '@smart-signer/lib/hiveauth/hiveauth-error';
import { expiryInMs, type HiveAuthSession } from '@smart-signer/lib/hiveauth/session';

/** The keys a wallet app signs with for HiveAuth */
export type HiveAuthKeyType = 'posting' | 'active';

/** What the channel uses of `hive-auth-client`'s `HasClient` */
export type HasClientLike = Pick<
  HasClient,
  | 'addEventHandler'
  | 'removeEventHandler'
  | 'connect'
  | 'isConnected'
  | 'clearExpireTimeout'
  | 'authenticate'
  | 'broadcast'
  | 'challenge'
>;

/** How the app introduces itself in the wallet app's approval screen */
export interface HiveAuthApp {
  name: string;
  description: string;
  icon: string;
}

export interface HiveAuthRequestOptions {
  signal?: AbortSignal;
  /** Called once the wallet app was sent the request: the user can approve it now */
  onPending?: () => void;
}

export interface HiveAuthAuthOptions {
  signal?: AbortSignal;
  /** Called with the `has://auth_req/…` link (and QR code content) the wallet app takes the session from */
  onAuthUri: (uri: string) => void;
}

export interface HiveAuthSignIn {
  session: HiveAuthSession;
  /** The challenge's signature by the account's key, in hex */
  signature: string;
}

type HasEvent = unknown;
type HasEventHandler = (event: HasEvent) => void;

/** One request and the events of its answer, as `HasClient` names and shapes them */
interface Exchange<T> {
  send(): void;
  pendingEvent: string;
  pendingUuid(event: HasEvent): string | undefined;
  onPending?(event: HasEvent, uuid: string | undefined): void;
  successEvent: string;
  successUuid(event: HasEvent): string | undefined;
  /** The answer; throws a `HiveAuthError` for an approval without what the request asked for */
  result(event: HasEvent): T;
  refusalEvent: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);
const text = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);
const messageUuid = (event: HasEvent) => text(field(field(event, 'message'), 'uuid'));
const eventUuid = (event: HasEvent) => text(field(event, 'uuid'));

function describeError(event: HasEvent): string | undefined {
  return text(field(event, 'error')) ?? text(field(event, 'message')) ?? text(field(field(event, 'message'), 'error'));
}

/** The id of the transaction a wallet app broadcast, from its `sign_ack` data; empty when it named none */
function transactionIdOf(data: unknown): string {
  return text(data) ?? text(field(data, 'id')) ?? text(field(data, 'tx_id')) ?? text(field(data, 'txid')) ?? '';
}

function authDataOf({ username, token, key, expire }: HiveAuthSession) {
  return { username, token, key, expire };
}

/**
 * HiveAuth requests through a HAS relay, each a promise of the wallet app's answer. Requests are
 * sent one at a time: `HasClient` follows only its latest one. A request rejects with a `HiveAuthError`
 * when it is cancelled (`signal`), rejected, expires, the relay cannot be reached, or the relay or
 * wallet app reports an error. A lost connection is re-opened by `HasClient`, which re-attaches the
 * pending request (a failed re-attach fails it); the next request re-opens one closed meanwhile.
 */
export class HiveAuthChannel {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly client: HasClientLike;
  private readonly relayUrl: string;
  private readonly app: HiveAuthApp;

  constructor(client: HasClientLike, relayUrl: string, app: HiveAuthApp) {
    this.client = client;
    this.relayUrl = relayUrl;
    this.app = app;
  }

  /**
   * Opens a HAS session for `username` (`auth_req`), with `challenge` signed by its `keyType` key as
   * the proof of the login.
   */
  authenticate(
    username: string,
    keyType: HiveAuthKeyType,
    challenge: string,
    { signal, onAuthUri }: HiveAuthAuthOptions
  ): Promise<HiveAuthSignIn> {
    return this.enqueue(signal, {
      send: () => this.client.authenticate({ username }, this.app, { key_type: keyType, challenge }),
      pendingEvent: 'AuthPending',
      pendingUuid: eventUuid,
      onPending: (event, uuid) => {
        const payload = { account: username, uuid, key: text(field(event, 'key')), host: this.relayUrl };
        onAuthUri(`has://auth_req/${btoa(JSON.stringify(payload))}`);
      },
      successEvent: 'AuthSuccess',
      successUuid: eventUuid,
      result: (event) => {
        const authData = field(event, 'authData');
        const key = text(field(authData, 'key'));
        const expire = field(authData, 'expire');
        const data = field(event, 'data');
        const signature = text(field(field(data, 'challenge_data') ?? field(data, 'challenge'), 'challenge'));
        if (!key || typeof expire !== 'number' || !signature) {
          throw new HiveAuthError('failed', 'the wallet app approved the sign-in without a session or signature');
        }
        const token = text(field(authData, 'token')) ?? '';
        return { session: { username, key, token, expire: expiryInMs(expire) }, signature };
      },
      refusalEvent: 'AuthFailure'
    });
  }

  /** Has the wallet app sign `operations` (Hive API JSON) with the `keyType` key and broadcast them; resolves with the transaction's id. */
  broadcast(
    session: HiveAuthSession,
    keyType: HiveAuthKeyType,
    operations: unknown[],
    { signal, onPending }: HiveAuthRequestOptions = {}
  ): Promise<string> {
    return this.enqueue(signal, {
      send: () => this.client.broadcast(authDataOf(session), keyType, operations),
      pendingEvent: 'SignPending',
      pendingUuid: messageUuid,
      onPending: () => onPending?.(),
      successEvent: 'SignSuccess',
      successUuid: messageUuid,
      result: (event) => {
        const message = field(event, 'message');
        if (field(message, 'broadcast') === false) {
          throw new HiveAuthError('failed', 'the wallet app signed the transaction without broadcasting it');
        }
        return transactionIdOf(field(message, 'data'));
      },
      refusalEvent: 'SignFailure'
    });
  }

  /** Has the wallet app sign `challenge` with the `keyType` key (`challenge_req`); resolves with the signature. */
  signChallenge(
    session: HiveAuthSession,
    keyType: HiveAuthKeyType,
    challenge: string,
    { signal, onPending }: HiveAuthRequestOptions = {}
  ): Promise<string> {
    return this.enqueue(signal, {
      send: () => this.client.challenge(authDataOf(session), { key_type: keyType, challenge }),
      pendingEvent: 'ChallengePending',
      pendingUuid: messageUuid,
      onPending: () => onPending?.(),
      successEvent: 'ChallengeSuccess',
      successUuid: eventUuid,
      result: (event) => {
        const signature = text(field(field(event, 'data'), 'challenge'));
        if (!signature) throw new HiveAuthError('failed', 'the wallet app approved the challenge without a signature');
        return signature;
      },
      refusalEvent: 'ChallengeFailure'
    });
  }

  private enqueue<T>(signal: AbortSignal | undefined, exchange: Exchange<T>): Promise<T> {
    const run = this.queue.then(() => this.exchange(signal, exchange));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async exchange<T>(signal: AbortSignal | undefined, exchange: Exchange<T>): Promise<T> {
    if (signal?.aborted) throw new HiveAuthError('cancelled');
    await this.client.connect();
    if (!this.client.isConnected) throw new HiveAuthError('unreachable');
    if (signal?.aborted) throw new HiveAuthError('cancelled');
    return new Promise<T>((resolve, reject) => {
      // Set by the relay's "waiting" answer: an approval of any other request is not this one's
      let uuid: string | undefined;
      const handlers: Array<[string, HasEventHandler]> = [];
      const finish = (settle: () => void) => {
        for (const [name, handler] of handlers) this.client.removeEventHandler(name, handler);
        signal?.removeEventListener('abort', onAbort);
        settle();
      };
      const fail = (error: unknown) => finish(() => reject(error));
      const onAbort = () => {
        this.client.clearExpireTimeout();
        fail(new HiveAuthError('cancelled'));
      };
      handlers.push(
        [
          exchange.pendingEvent,
          (event) => {
            uuid = exchange.pendingUuid(event);
            exchange.onPending?.(event, uuid);
          }
        ],
        [
          exchange.successEvent,
          (event) => {
            if (uuid === undefined || exchange.successUuid(event) !== uuid) return;
            try {
              const value = exchange.result(event);
              finish(() => resolve(value));
            } catch (error) {
              fail(error);
            }
          }
        ],
        [exchange.refusalEvent, () => fail(new HiveAuthError('rejected'))],
        ['Error', (event) => fail(new HiveAuthError('failed', describeError(event)))],
        ['AttachFailure', () => fail(new HiveAuthError('failed', 'the relay connection was lost'))],
        ['RequestExpired', () => fail(new HiveAuthError('expired'))]
      );
      for (const [name, handler] of handlers) this.client.addEventHandler(name, handler);
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        exchange.send();
      } catch (error) {
        fail(new HiveAuthError('failed', error instanceof Error ? error.message : String(error)));
      }
    });
  }
}
