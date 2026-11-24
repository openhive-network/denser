import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readShownActiveCheck } from './shown-active-check.ts';

const USERNAME = 'alice';

/**
 * hb-auth's reading of a wallet's setting: verified while `unlocked`; while locked as `stored`, a
 * missing (`undefined`) or tampered record reading as on
 */
function clientOf(stored: boolean | undefined, unlocked: boolean) {
  return {
    async getRequireActiveCheck() {
      return stored ?? true;
    },
    async getRegisteredUserByUsername(username: string) {
      return { username, unlocked, authorized: true, loggedInKeyType: 'posting' as const, registeredKeyTypes: [] };
    }
  };
}

/** hb-auth's store, holding a record of `stored`, or unreadable when `readable` is false */
const storeOf =
  (stored: boolean | undefined, readable = true) =>
  async (username: string) => {
    assert.equal(username, USERNAME);
    return readable ? stored !== undefined : undefined;
  };

describe('readShownActiveCheck', () => {
  it('shows a locked wallet that stored the setting on as on', async () => {
    assert.equal(await readShownActiveCheck(clientOf(true, false), USERNAME, storeOf(true)), true);
  });

  it('shows a locked wallet that stored the setting off as off', async () => {
    assert.equal(await readShownActiveCheck(clientOf(false, false), USERNAME, storeOf(false)), false);
  });

  it('shows a locked wallet from before the setting, which has no record, as off', async () => {
    assert.equal(await readShownActiveCheck(clientOf(undefined, false), USERNAME, storeOf(undefined)), false);
  });

  it('keeps a setting hb-auth reads as on, on, when its store cannot be read', async () => {
    assert.equal(await readShownActiveCheck(clientOf(undefined, false), USERNAME, storeOf(undefined, false)), true);
  });

  it("shows an unlocked wallet's verified setting without reading the store", async () => {
    const unread = async () => assert.fail('the store is read only for a locked wallet');
    assert.equal(await readShownActiveCheck(clientOf(true, true), USERNAME, unread), true);
    assert.equal(await readShownActiveCheck(clientOf(false, true), USERNAME, unread), false);
  });
});
