import { test, expect } from '../support/fixture-proxy-test';
import { LoginType } from '@smart-signer/types/common';
import { installBroadcastInterceptor, expectVoteOperation } from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import {
  VOTER,
  FIRST_POST_AUTHOR,
  FIRST_POST_PERMLINK,
  FULL_UPVOTE,
  gotoTrendingLoggedIn
} from '../support/postVotingContext';
import { recordSigningStackScripts } from '../support/signingStack';
import { recordWasmRequests, settleAfterLoad } from '../support/wasmRequests';

/**
 * A Keychain user's first vote loads the signing stack: nothing of it (wax's JavaScript and wasm,
 * the signers) is loaded while the logged-in page loads and idles; the click loads it, Keychain
 * signs the vote and the signed transaction is broadcast.
 *
 * Keychain is a stub of the extension's `window.hive_keychain`; it records the transactions it is
 * asked to sign and answers with a fixed signature. Reuses the `postVoting` recording.
 */

test.use({ fixtureTestName: 'postVoting', authenticatedUser: { loginType: LoginType.keychain } });

/** A well-formed (65-byte, hex) signature; the broadcast is intercepted, so it need not be valid. */
const KEYCHAIN_SIGNATURE = `1f${'ab'.repeat(64)}`;

interface IKeychainSignTxCall {
  account: string;
  role: string;
  operations: unknown[];
}

declare global {
  interface Window {
    hive_keychain: unknown;
    keychainSignTxCalls: IKeychainSignTxCall[];
  }
}

test('LOGGED-WASM-05: the first vote loads the signing stack and is signed by Keychain', async ({ page }) => {
  await page.addInitScript((signature) => {
    window.keychainSignTxCalls = [];
    type Callback = (response: { success: boolean; result: unknown }) => void;
    window.hive_keychain = {
      requestSignBuffer: (_account: string, _message: string, _role: string, callback: Callback) =>
        callback({ success: true, result: signature }),
      requestSignTx: (account: string, tx: { operations: unknown[] }, role: string, callback: Callback) => {
        window.keychainSignTxCalls.push({ account, role, operations: tx.operations });
        callback({ success: true, result: { ...tx, signatures: [signature] } });
      }
    };
  }, KEYCHAIN_SIGNATURE);
  const broadcast = await installBroadcastInterceptor(page);
  const wasmRequests = recordWasmRequests(page);
  const signingStackScripts = recordSigningStackScripts(page);

  await gotoTrendingLoggedIn(page);
  await settleAfterLoad(page);
  expect(wasmRequests).toEqual([]);
  expect(await signingStackScripts()).toEqual([]);

  await new HomePage(page).getFirstPostUpvoteButton.click();

  await broadcast.waitForCount(1);
  expectVoteOperation(broadcast.calls[0], {
    voter: VOTER,
    author: FIRST_POST_AUTHOR,
    permlink: FIRST_POST_PERMLINK,
    weight: FULL_UPVOTE
  });
  expect(broadcast.calls[0].params).toMatchObject({ trx: { signatures: [KEYCHAIN_SIGNATURE] } });

  const keychainCalls = await page.evaluate(() => window.keychainSignTxCalls);
  expect(keychainCalls).toHaveLength(1);
  expect(keychainCalls[0]).toMatchObject({ account: VOTER, role: 'posting' });
  expect(JSON.stringify(keychainCalls[0].operations)).toContain(FIRST_POST_PERMLINK);

  expect(wasmRequests.length).toBeGreaterThan(0);
  expect(await signingStackScripts()).not.toEqual([]);
});
