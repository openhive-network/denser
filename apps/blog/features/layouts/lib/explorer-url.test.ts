import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { explorerUrl } from './explorer-url.ts';

const EXPLORER = 'https://explore.openhive.network';

describe('explorerUrl', () => {
  it('leads a signed-out reader to the explorer home page', () => {
    assert.equal(explorerUrl(EXPLORER, { isLoggedIn: false, username: '' }), EXPLORER);
  });

  it('leads a signed-in Hive account to its own explorer page', () => {
    assert.equal(
      explorerUrl(EXPLORER, { isLoggedIn: true, username: 'guest4test1' }),
      'https://explore.openhive.network/@guest4test1'
    );
  });

  it('leads a lite account to the explorer home page', () => {
    assert.equal(explorerUrl(EXPLORER, { isLoggedIn: true, username: 'did:lite:crisp-koala-499' }), EXPLORER);
  });

  it('falls back to the default explorer when none is configured', () => {
    assert.equal(explorerUrl(undefined), EXPLORER);
    assert.equal(
      explorerUrl(undefined, { isLoggedIn: true, username: 'guest4test1' }),
      'https://explore.openhive.network/@guest4test1'
    );
  });

  it('ignores a username left behind by a signed-out session', () => {
    assert.equal(explorerUrl(EXPLORER, { isLoggedIn: false, username: 'guest4test1' }), EXPLORER);
  });
});
