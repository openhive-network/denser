import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { senderLabel } from './sender-label.ts';

describe('senderLabel', () => {
  it('shows the localpart next to a display name that could pass for someone else', () => {
    assert.deepEqual(senderLabel('@mallory:openhive.chat', 'Hive Support'), {
      name: 'Hive Support',
      handle: '@mallory'
    });
  });

  it('shows the localpart alone when the display name only repeats the id', () => {
    for (const name of ['alice', '@alice', '@alice:openhive.chat', '']) {
      assert.deepEqual(senderLabel('@alice:openhive.chat', name), { name: null, handle: '@alice' });
    }
  });

  it('keeps a display name that differs from the localpart only in case', () => {
    assert.deepEqual(senderLabel('@bob:openhive.chat', 'Bob'), { name: 'Bob', handle: '@bob' });
  });
});
