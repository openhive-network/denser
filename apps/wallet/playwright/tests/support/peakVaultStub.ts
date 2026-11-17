import type { Page } from '@playwright/test';

/**
 * A stand-in for the Peak Vault extension (`window.peakvault`) for the offline specs: each
 * `requestDecode` (memo decode) takes the next of the answers it is given, the last one repeating;
 * `requestSignTx` signs with PEAK_VAULT_STUB_SIGNATURE. Every request is recorded so a spec can
 * check what the wallet asked Peak Vault for.
 */

/** A well-formed signature of no key; a spec's broadcast interceptor accepts it. */
export const PEAK_VAULT_STUB_SIGNATURE = '1f' + 'ab'.repeat(64);

/** Peak Vault rejects a request with its own response, a plain object rather than an Error */
export interface IPeakVaultStubRejection {
  error: string;
  message: string;
}

export interface IPeakVaultStubCall {
  method: string;
  args: unknown[];
}

const CALLS_GLOBAL = '__peakVaultStubCalls';

/** `decodeAnswers`: a plaintext to decode to, or a rejection, per `requestDecode` call */
export const installPeakVaultStub = (page: Page, decodeAnswers: (string | IPeakVaultStubRejection)[] = []) =>
  page.context().addInitScript(
    ({ decodeAnswers, callsGlobal, signature }) => {
      const calls: { method: string; args: unknown[] }[] = [];
      let decodeCount = 0;
      Reflect.set(window, callsGlobal, calls);
      Reflect.set(window, 'peakvault', {
        requestDecode: async (...args: unknown[]) => {
          calls.push({ method: 'requestDecode', args });
          decodeCount += 1;
          const answer = decodeAnswers[Math.min(decodeCount, decodeAnswers.length) - 1];
          if (typeof answer === 'string') return { success: true, error: null, result: answer };
          throw { success: false, account: args[0], result: null, ...answer };
        },
        requestSignTx: async (...args: unknown[]) => {
          calls.push({ method: 'requestSignTx', args });
          return { success: true, error: null, result: { ...Object(args[1]), signatures: [signature] } };
        }
      });
    },
    { decodeAnswers, callsGlobal: CALLS_GLOBAL, signature: PEAK_VAULT_STUB_SIGNATURE }
  );

/** The requests the wallet made to the stub, in order. */
export const peakVaultCalls = (page: Page): Promise<IPeakVaultStubCall[]> =>
  page.evaluate((callsGlobal) => Reflect.get(window, callsGlobal) as IPeakVaultStubCall[], CALLS_GLOBAL);
