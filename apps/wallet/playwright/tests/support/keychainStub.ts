import type { Page } from '@playwright/test';

/**
 * A stand-in for the Hive Keychain extension (`window.hive_keychain`) for the offline specs: each
 * request answers at once with the result it is given (or an error when it has none), and is
 * recorded so a spec can check what the wallet asked Keychain for.
 */

/** Keychain's answer to a request the user did not approve, or `'no answer'` for one it leaves unanswered (see answerUnansweredKeychainRequests) */
export type KeychainStubFailure = { error: string; message: string } | 'no answer';

export interface IKeychainStubResults {
  /** The plaintext `requestVerifyKey` (memo decode) answers. */
  verifyKey?: string;
  /** What the first `requestVerifyKey` calls get, in order, before `verifyKey` answers the later ones. */
  verifyKeyFailures?: KeychainStubFailure[];
  /** The ciphertext `requestEncodeMessage` (memo encode) answers. */
  encodeMessage?: string;
}

export interface IKeychainCall {
  method: string;
  args: unknown[];
}

/** Not a valid signature of anything: the stub node accepts any, and nothing checks it before the broadcast. */
const STUB_SIGNATURE = `1f${'00'.repeat(64)}`;

const CALLS_GLOBAL = '__keychainStubCalls';
const UNANSWERED_GLOBAL = '__keychainStubUnanswered';

export const installKeychainStub = (page: Page, results: IKeychainStubResults) =>
  page.context().addInitScript(
    ({ results, signature, callsGlobal, unansweredGlobal }) => {
      type Callback = (response: { success: boolean; result?: unknown; error?: string }) => void;
      const calls: { method: string; args: unknown[] }[] = [];
      Reflect.set(window, callsGlobal, calls);
      const unanswered: Callback[] = [];
      Reflect.set(window, unansweredGlobal, unanswered);
      const verifyKeyFailures = [...(results.verifyKeyFailures ?? [])];
      const answer =
        (method: string, result: (args: unknown[]) => unknown, failures: typeof verifyKeyFailures = []) =>
        (...args: unknown[]) => {
          const callback = args.pop() as Callback;
          calls.push({ method, args });
          const failure = failures.shift();
          if (failure === 'no answer') {
            unanswered.push(callback);
            return;
          }
          if (failure) {
            callback({ success: false, ...failure });
            return;
          }
          const value = result(args);
          callback(
            value === undefined
              ? { success: false, error: `${method} is not stubbed` }
              : { success: true, result: value }
          );
        };
      Reflect.set(window, 'hive_keychain', {
        requestSignBuffer: answer('requestSignBuffer', () => undefined),
        requestVerifyKey: answer('requestVerifyKey', () => results.verifyKey, verifyKeyFailures),
        requestEncodeMessage: answer('requestEncodeMessage', () => results.encodeMessage),
        requestSignTx: answer('requestSignTx', ([, transaction]) => ({
          ...(transaction as object),
          signatures: [signature]
        }))
      });
    },
    { results, signature: STUB_SIGNATURE, callsGlobal: CALLS_GLOBAL, unansweredGlobal: UNANSWERED_GLOBAL }
  );

/** The requests the wallet made to the stub, in order. */
export const keychainCalls = (page: Page): Promise<IKeychainCall[]> =>
  page.evaluate((callsGlobal) => Reflect.get(window, callsGlobal) as IKeychainCall[], CALLS_GLOBAL);

/** Answers the requests left unanswered so far with `failure`, as Keychain does once a newer request supersedes them. */
export const answerUnansweredKeychainRequests = (page: Page, failure: Exclude<KeychainStubFailure, 'no answer'>) =>
  page.evaluate(
    ({ unansweredGlobal, failure }) => {
      const unanswered = Reflect.get(window, unansweredGlobal) as ((response: object) => void)[];
      unanswered.splice(0).forEach((callback) => callback({ success: false, ...failure }));
    },
    { unansweredGlobal: UNANSWERED_GLOBAL, failure }
  );
