import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { collectExternalImageUrls, needsProxyAuth } = await import('./proxy-auth.ts');

const PROXY = 'https://images.hive.blog';
const EXTERNAL = 'https://example.com/a.png';
const OTHER_EXTERNAL = 'https://example.org/b.jpg';

describe('collectExternalImageUrls', () => {
  it("finds markdown, bare and html images, skipping the proxy's own", () => {
    const content = [
      `![a](${EXTERNAL})`,
      OTHER_EXTERNAL,
      '<img src="https://example.net/c.gif">',
      `![up](${PROXY}/guest4test1/d.png)`
    ].join('\n');
    assert.deepEqual(collectExternalImageUrls(content, PROXY).sort(), [
      EXTERNAL,
      'https://example.net/c.gif',
      OTHER_EXTERNAL
    ]);
  });
});

describe('needsProxyAuth', () => {
  it('needs no token for text or images the proxy hosts', () => {
    assert.equal(needsProxyAuth(`text ![up](${PROXY}/u/x.png)`, PROXY, new Set()), false);
  });

  it('needs no token when every external image is already in the published post', () => {
    assert.equal(needsProxyAuth(`![a](${EXTERNAL}) and one more character`, PROXY, new Set([EXTERNAL])), false);
  });

  it('needs a token for an external image the published post does not have', () => {
    const content = `![a](${EXTERNAL})\n![b](${OTHER_EXTERNAL})`;
    assert.equal(needsProxyAuth(content, PROXY, new Set([EXTERNAL])), true);
  });
});
