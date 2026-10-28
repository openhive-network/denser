import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { allowedGatewayPath } = await import('./gateway-paths.ts');

describe('allowedGatewayPath', () => {
  it('relays the posting endpoints, POST only', () => {
    assert.equal(allowedGatewayPath('POST', ['reply']), '/reply');
    assert.equal(allowedGatewayPath('POST', ['post']), '/post');
    assert.equal(allowedGatewayPath('POST', ['edit']), '/edit');
    assert.equal(allowedGatewayPath('POST', ['delete']), '/delete');
    assert.equal(allowedGatewayPath('POST', ['l2']), '/l2');
    assert.equal(allowedGatewayPath('POST', ['graduate']), '/graduate');
    assert.equal(allowedGatewayPath('GET', ['graduate']), null);
    assert.equal(allowedGatewayPath('GET', ['l2']), null);
    assert.equal(allowedGatewayPath('GET', ['post']), null);
    assert.equal(allowedGatewayPath('GET', ['edit']), null);
    assert.equal(allowedGatewayPath('DELETE', ['reply']), null);
    assert.equal(allowedGatewayPath('DELETE', ['delete']), null);
  });

  it('relays a queue entry: GET and DELETE on it, POST on its /post', () => {
    assert.equal(allowedGatewayPath('GET', ['queue', 'q_1-AB']), '/queue/q_1-AB');
    assert.equal(allowedGatewayPath('DELETE', ['queue', 'q_1-AB']), '/queue/q_1-AB');
    assert.equal(allowedGatewayPath('POST', ['queue', 'q_1-AB', 'post']), '/queue/q_1-AB/post');
    assert.equal(allowedGatewayPath('POST', ['queue', 'q_1-AB']), null);
    assert.equal(allowedGatewayPath('GET', ['queue', 'q_1-AB', 'post']), null);
    assert.equal(allowedGatewayPath('DELETE', ['queue', 'q_1-AB', 'post']), null);
  });

  it('relays a lite account authority read: GET only, for a name in the lite grammar', () => {
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'authority']), '/names/brave-otter-482/authority');
    assert.equal(allowedGatewayPath('POST', ['names', 'brave-otter-482', 'authority']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'Not A Name', 'authority']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'authority', 'owner']), null);
  });

  it('relays a lite account graduation read: GET only, for a name in the lite grammar', () => {
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'graduation']), '/names/brave-otter-482/graduation');
    assert.equal(allowedGatewayPath('POST', ['names', 'brave-otter-482', 'graduation']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'Not A Name', 'graduation']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'graduation', 'more']), null);
  });

  it('relays a name availability check: GET only, for a name in the lite grammar', () => {
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'availability']), '/names/brave-otter-482/availability');
    assert.equal(allowedGatewayPath('GET', ['names', 'lite.smoke-1016', 'availability']), '/names/lite.smoke-1016/availability');
    assert.equal(allowedGatewayPath('POST', ['names', 'brave-otter-482', 'availability']), null);
    assert.equal(allowedGatewayPath('DELETE', ['names', 'brave-otter-482', 'availability']), null);
    for (const name of ['ab', 'x'.repeat(17), 'Brave-otter', '1brave', 'brave-', 'a..b', '..', 'a/b', 'a?x=1', 'brave otter', '']) {
      assert.equal(allowedGatewayPath('GET', ['names', name, 'availability']), null, name);
    }
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'toString']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'other']), null);
    assert.equal(allowedGatewayPath('GET', ['names', 'brave-otter-482', 'availability', 'more']), null);
  });

  it('refuses everything else: other gateway endpoints, odd queue ids, extra segments', () => {
    for (const segments of [['info'], ['health'], ['names'], ['gates', 'next'], ['edit', 'x'], ['toString'], []]) {
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
