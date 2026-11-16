import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const PROXY = 'https://images.hive.blog';

// Node resolves neither the tsconfig path alias nor an extensionless import: point `@ui/…` at
// the package's TypeScript source, and give it a fixed image proxy instead of the env-read one.
const UI_ALIAS = '@ui/';
const PUBLIC_VARS = '@hive/ui/config/public-vars';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === PUBLIC_VARS) {
      return {
        url: `data:text/javascript,export const configuredImagesEndpoint = '${PROXY}';`,
        shortCircuit: true
      };
    }
    if (!specifier.startsWith(UI_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(`../../../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
});

const { proxifyCardImage } = await import('./card-image-src.ts');
const { proxifyImageSrc } = await import('@ui/lib/proxify-images');

const CARD_PROXY_URL = new RegExp(`^${PROXY}/p/([1-9A-HJ-NP-Za-km-z]+)\\?(.*)$`);

function parseProxied(url: string): { hash: string; query: string } {
  const match = url.match(CARD_PROXY_URL);
  assert.ok(match, `not a ${PROXY}/p/ URL: ${url}`);
  return { hash: match[1], query: match[2] };
}

describe('proxifyCardImage', () => {
  it('asks for WebP at card size for a PNG or JPEG source', () => {
    for (const source of ['https://files.peakd.com/a/b.png', 'https://example.com/photo.JPG?x=1']) {
      assert.equal(parseProxied(proxifyCardImage(source)).query, 'format=webp&mode=fit&width=256&height=512');
    }
  });

  it('asks for a GIF as a WebP still at card size', () => {
    for (const source of ['https://example.com/anim.gif', 'https://example.com/anim.GIF?v=2']) {
      assert.equal(parseProxied(proxifyCardImage(source)).query, 'format=webp&mode=fit&width=256&height=512');
    }
  });

  it('leaves a GIF unresized in its own format for a post body image', () => {
    assert.equal(parseProxied(proxifyImageSrc('https://example.com/anim.gif', 1536, 0)).query, 'format=match&mode=fit');
  });

  it('keeps an SVG at its own format', () => {
    assert.equal(
      parseProxied(proxifyCardImage('https://example.com/logo.svg')).query,
      'format=match&mode=fit&width=256&height=512'
    );
  });

  it('returns a URL already proxied by the image proxy unchanged', () => {
    const proxied = `${PROXY}/p/46aP2QbqUqBqwzwxM6L1P6uLNceBDDCM9ZJdv282fpHyc9Wgcz1FduB11aVXtczv9TiCSHF1?format=match&mode=fit`;
    assert.equal(proxifyCardImage(proxied), proxied);
  });

  it("asks for a GIF behind another proxy's /p/ URL as a WebP still", () => {
    const { hash: gifHash } = parseProxied(proxifyCardImage('https://example.com/anim.gif'));
    const otherProxy = 'https://images.example.org/p';
    assert.equal(
      parseProxied(proxifyCardImage(`${otherProxy}/${gifHash}?format=match`)).query,
      'format=webp&mode=fit&width=256&height=512'
    );
  });

  it("reads an SVG behind another proxy's /p/ URL and keeps its format", () => {
    const { hash: svgHash } = parseProxied(proxifyCardImage('https://example.com/logo.svg'));
    const otherProxy = 'https://images.example.org/p';
    assert.equal(
      parseProxied(proxifyCardImage(`${otherProxy}/${svgHash}?format=match`)).query,
      'format=match&mode=fit&width=256&height=512'
    );
  });

  it('returns no URL for a missing source', () => {
    assert.equal(proxifyCardImage(undefined), '');
    assert.equal(proxifyCardImage(''), '');
  });
});
