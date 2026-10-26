import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { notificationSource } = await import('./notification-source.ts');

describe('notificationSource', () => {
  it('names a Hive source by name and keeps the rest of the message', () => {
    assert.deepEqual(notificationSource('@test-gateway-5 replied to your post'), {
      account: 'test-gateway-5',
      text: ' replied to your post'
    });
  });

  it('names a lite source by its whole DID', () => {
    assert.deepEqual(notificationSource('@did:lite:crisp-koala-499 followed you'), {
      account: 'did:lite:crisp-koala-499',
      text: ' followed you'
    });
  });

  it('answers null for a message naming no account', () => {
    assert.equal(notificationSource('error: something failed'), null);
  });
});
