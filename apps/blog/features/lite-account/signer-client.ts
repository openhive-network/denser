import type { L2Transaction } from '@hiveio/lite-account';

// TODO: swap for @hiveio/passkey-signer-client once it is published; this is its popup protocol
// (hive-passkey-signer, protocol "1"): the signer page posts a ready message to its opener, takes
// ONE request `{ hiveSigner, id, method, params }` and answers `{ hiveSigner, id, result | error }`.

export const SIGNER_PROTOCOL = '1';
/** The signer's key roles, by its numbering. */
export const SIGNER_ROLES = { owner: 0, active: 1, memo: 3, posting: 4 } as const;

const SIGN_PATH = '/sign/';
const POPUP_FEATURES = 'popup,width=480,height=720';
/** How long the opened page has to say it is ready before the signer counts as unreachable. */
const READY_TIMEOUT_MS = 30_000;
const CLOSED_POLL_MS = 500;

/**
 * A signer failure: the signer's own codes (`cancelled`, `key_not_found`, `owner_blind_signing`,
 * `prf_unsupported`, `webauthn_unavailable`, `busy`, `invalid_request`, `internal`) and the
 * client's `popup_blocked` and `signer_unavailable`. A closed popup is `cancelled`.
 */
export class SignerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SignerError';
    this.code = code;
  }
}

export type SignerKey = { path: string; role: number; account: number; key: number; publicKey: string };

type SignerMethods = {
  getPublicKeys: {
    params: { roles: number[]; account?: number; count?: number };
    result: { keys: SignerKey[] };
  };
  signL2Transaction: {
    params: { transaction: L2Transaction; chainId: string; publicKey: string };
    result: { signedTransaction: L2Transaction; signatures: string[]; digest: string };
  };
  signDigest: {
    params: { sigDigest: string; publicKey: string; purpose?: string };
    result: { signature: string };
  };
};
export type SignerMethod = keyof SignerMethods;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isSignerReady = (data: unknown): boolean =>
  isObject(data) && data.hiveSignerReady === true && data.hiveSigner === SIGNER_PROTOCOL;

export function signerRequest<M extends SignerMethod>(
  id: string,
  method: M,
  params: SignerMethods[M]['params']
) {
  return { hiveSigner: SIGNER_PROTOCOL, id, method, params };
}

/**
 * The outcome carried by a signer message answering request `id`: its result, a thrown
 * `SignerError` for an error reply, or `undefined` for any other message.
 */
export function signerReply(data: unknown, id: string): { result: unknown } | undefined {
  if (!isObject(data) || data.hiveSigner !== SIGNER_PROTOCOL || data.id !== id) return undefined;
  if ('result' in data) return { result: data.result };
  const error = isObject(data.error) ? data.error : {};
  const code = typeof error.code === 'string' ? error.code : 'internal';
  throw new SignerError(code, typeof error.message === 'string' ? error.message : code);
}

const isKey = (value: unknown): value is SignerKey =>
  isObject(value) && typeof value.publicKey === 'string' && typeof value.role === 'number';

const RESULT_GUARDS: { [M in SignerMethod]: (value: unknown) => value is SignerMethods[M]['result'] } = {
  getPublicKeys: (value): value is SignerMethods['getPublicKeys']['result'] =>
    isObject(value) && Array.isArray(value.keys) && value.keys.every(isKey),
  signL2Transaction: (value): value is SignerMethods['signL2Transaction']['result'] =>
    isObject(value) && isObject(value.signedTransaction) && Array.isArray(value.signatures),
  signDigest: (value): value is SignerMethods['signDigest']['result'] =>
    isObject(value) && typeof value.signature === 'string'
};

type PopupWindow = {
  readonly closed: boolean;
  close: () => void;
  postMessage: (message: unknown, targetOrigin: string) => void;
};
/** What the client needs of the opener's window; `window` in the browser. */
export type SignerHost = {
  open: (url: string, target: string, features: string) => PopupWindow | null;
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
};

export type SignerPopup = {
  origin: string;
  call: <M extends SignerMethod>(
    method: M,
    params: SignerMethods[M]['params']
  ) => Promise<SignerMethods[M]['result']>;
  close: () => void;
};

/**
 * Settles with the first message from `popup` (at `origin`) that `match` maps to a value; rejects
 * with what `match` throws, `cancelled` once the popup is closed, `signer_unavailable` after
 * `timeoutMs`. Every listener and timer is gone once it settles.
 */
function waitFor<T>(
  host: SignerHost,
  popup: PopupWindow,
  origin: string,
  match: (data: unknown) => T | undefined,
  timeoutMs?: number
) {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      host.removeEventListener('message', onMessage);
      clearInterval(closedPoll);
      clearTimeout(timeout);
    };
    const settle = (outcome: () => T) => {
      cleanup();
      try {
        resolve(outcome());
      } catch (error) {
        reject(error);
      }
    };
    const fail = (code: string, message: string) =>
      settle(() => {
        throw new SignerError(code, message);
      });
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin || event.source !== popup) return;
      try {
        const value = match(event.data);
        if (value !== undefined) settle(() => value);
      } catch (error) {
        settle(() => {
          throw error;
        });
      }
    }
    const closedPoll = setInterval(() => {
      if (popup.closed) fail('cancelled', 'the signer window was closed');
    }, CLOSED_POLL_MS);
    const timeout =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => fail('signer_unavailable', `${origin} did not answer`), timeoutMs);
    host.addEventListener('message', onMessage);
  });
}

/**
 * Opens the signer at `origin` in a popup. Call it from the click handler (a popup opened later
 * is blocked: `SignerError('popup_blocked')` then). The page takes one request; `call` sends it
 * once the page is ready and resolves with the validated result, or rejects with a `SignerError`.
 */
export function openSignerPopup(origin: string, host: SignerHost = window): SignerPopup {
  const popup = host.open(`${origin}${SIGN_PATH}`, 'hive-passkey-signer', POPUP_FEATURES);
  if (!popup) throw new SignerError('popup_blocked', 'the browser blocked the signer popup');
  const ready = waitFor(
    host,
    popup,
    origin,
    (data) => (isSignerReady(data) ? true : undefined),
    READY_TIMEOUT_MS
  );
  // Observed by `call`; a popup closed before any call must not surface as an unhandled rejection.
  ready.catch(() => undefined);

  const call: SignerPopup['call'] = async (method, params) => {
    await ready;
    const id = crypto.randomUUID();
    const isResult = RESULT_GUARDS[method];
    const reply = waitFor(host, popup, origin, (data) => {
      const answer = signerReply(data, id);
      if (!answer) return undefined;
      if (!isResult(answer.result)) throw new SignerError('internal', `unexpected ${method} result`);
      return answer.result;
    });
    popup.postMessage(signerRequest(id, method, params), origin);
    return reply;
  };

  const close = () => {
    if (!popup.closed) popup.close();
  };

  return { origin, call, close };
}

/** The signer and client codes a user gets a message for, by their `lite_account.signer_errors.*` key. */
const SIGNER_ERROR_KEYS = new Set([
  'popup_blocked',
  'signer_unavailable',
  'key_not_found',
  'owner_blind_signing',
  'prf_unsupported',
  'webauthn_unavailable',
  'busy',
  'invalid_request'
]);

/**
 * The `lite_account.signer_errors.*` key explaining a signer failure; `internal` for any other code
 * or error; null for `cancelled`, which the user chose and is told nothing about.
 */
export function signerErrorKey(error: unknown): string | null {
  if (!(error instanceof SignerError)) return 'internal';
  if (error.code === 'cancelled') return null;
  return SIGNER_ERROR_KEYS.has(error.code) ? error.code : 'internal';
}
