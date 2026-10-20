import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { allowedGatewayPath } = await import('./gateway-paths.ts');

describe('allowedGatewayPath', () => {
  it('relays the posting endpoints, POST only', () => {
    assert.equal(allowedGatewayPath('POST', ['reply']), '/reply');
    assert.equal(allowedGatewayPath('POST', ['post']), '/post');
    assert.equal(allowedGatewayPath('GET', ['post']), null);
    assert.equal(allowedGatewayPath('DELETE', ['reply']), null);
  });

  it('relays a queue entry: GET and DELETE on it, POST on its /post', () => {
    assert.equal(allowedGatewayPath('GET', ['queue', 'q_1-AB']), '/queue/q_1-AB');
    assert.equal(allowedGatewayPath('DELETE', ['queue', 'q_1-AB']), '/queue/q_1-AB');
    assert.equal(allowedGatewayPath('POST', ['queue', 'q_1-AB', 'post']), '/queue/q_1-AB/post');
    assert.equal(allowedGatewayPath('POST', ['queue', 'q_1-AB']), null);
    assert.equal(allowedGatewayPath('GET', ['queue', 'q_1-AB', 'post']), null);
    assert.equal(allowedGatewayPath('DELETE', ['queue', 'q_1-AB', 'post']), null);
  });

  it('refuses everything else: other gateway endpoints, odd queue ids, extra segments', () => {
    for (const segments of [['info'], ['health'], ['edit'], ['delete'], ['gates', 'next'], []]) {
      assert.equal(allowedGatewayPath('POST', segments), null, segments.join('/'));
      assert.equal(allowedGatewayPath('GET', segments), null, segments.join('/'));
    }
    assert.equal(allowedGatewayPath('GET', ['queue', '..']), null);
    assert.equal(allowedGatewayPath('GET', ['queue', 'a/b']), null);
    assert.equal(allowedGatewayPath('GET', ['queue', 'a?x=1']), null);
    assert.equal(allowedGatewayPath('GET', ['queue', 'x'.repeat(129)]), null);
    assert.equal(allowedGatewayPath('POST', ['queue', 'id', 'post', 'more']), null);
    assert.equal(allowedGatewayPath('PUT', ['post']), null);
  });
});
