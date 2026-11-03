import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decryptMemoWithPeakVault, PeakVaultNotInstalledError } from './peakvault-memo-crypto.ts';
import { isWalletRequestRejected } from './wallet-request-rejected.ts';

const stubPeakVault = (requestDecode: (...args: unknown[]) => Promise<unknown>) => {
  Object.defineProperty(globalThis, 'window', {
    value: { peakvault: { requestDecode } },
    configurable: true
  });
};

describe('decryptMemoWithPeakVault', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it("asks Peak Vault to decode with the account's memo key and returns the plaintext", async () => {
    let captured: unknown[] = [];
    stubPeakVault(async (...args) => {
      captured = args;
      return { success: true, result: '#secret' };
    });

    assert.equal(await decryptMemoWithPeakVault('alice', '#encrypted'), '#secret');
    assert.deepEqual(captured, ['alice', '#encrypted', 'memo']);
  });

  it('throws the response of a request the user cancelled, recognized as rejected', async () => {
    const cancel = {
      success: false,
      error: 'user_cancel',
      message: 'Request was canceled by the user.',
      result: null
    };
    stubPeakVault(async () => {
      throw cancel;
    });

    const error = await decryptMemoWithPeakVault('alice', '#encrypted').catch((thrown: unknown) => thrown);
    assert.equal(error, cancel);
    assert.equal(isWalletRequestRejected(error), true);
  });

  it('throws a resolved failure instead of returning its missing result as the memo', async () => {
    const failure = { success: false, error: 'user_cancel', message: 'Request was canceled by the user.' };
    stubPeakVault(async () => failure);

    await assert.rejects(decryptMemoWithPeakVault('alice', '#encrypted'), (error) => error === failure);
  });

  it('throws when the extension is missing', async () => {
    await assert.rejects(decryptMemoWithPeakVault('alice', '#encrypted'), PeakVaultNotInstalledError);
  });
});
