import type { Page } from '@playwright/test';

/**
 * A stand-in for the Peak Vault extension (`window.peakvault`) for the offline specs: each
 * `requestDecode` (memo decode) takes the next of the answers it is given, the last one repeating,
 * and is recorded so a spec can check what the wallet asked Peak Vault for.
 */

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
export const installPeakVaultStub = (page: Page, decodeAnswers: (string | IPeakVaultStubRejection)[]) =>
  page.context().addInitScript(
    ({ decodeAnswers, callsGlobal }) => {
      const calls: { method: string; args: unknown[] }[] = [];
      Reflect.set(window, callsGlobal, calls);
      Reflect.set(window, 'peakvault', {
        requestDecode: async (...args: unknown[]) => {
          calls.push({ method: 'requestDecode', args });
          const answer = decodeAnswers[Math.min(calls.length, decodeAnswers.length) - 1];
          if (typeof answer === 'string') return { success: true, error: null, result: answer };
          throw { success: false, account: args[0], result: null, ...answer };
        }
      });
    },
    { decodeAnswers, callsGlobal: CALLS_GLOBAL }
  );

/** The requests the wallet made to the stub, in order. */
export const peakVaultCalls = (page: Page): Promise<IPeakVaultStubCall[]> =>
  page.evaluate((callsGlobal) => Reflect.get(window, callsGlobal) as IPeakVaultStubCall[], CALLS_GLOBAL);
