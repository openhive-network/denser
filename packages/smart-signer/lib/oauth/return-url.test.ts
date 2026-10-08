import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless workspace subpath:
// point `@hive/ui/…` at the package's TypeScript source.
const UI_ALIAS = '@hive/ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(UI_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(`../../../ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
});

const { buildOAuthReturnUrl } = await import('./return-url.ts');

const OAUTH_STATE = {
  clientId: 'openhive_chat',
  redirectUri: 'https://openhive.chat/_oauth/hive',
  scope: 'openid profile',
  state: 'xyz'
};

describe('buildOAuthReturnUrl', () => {
  const cases: [string, string][] = [
    ['https://h', 'https://h/api/oauth/authorize'],
    ['https://h/', 'https://h/api/oauth/authorize'],
    ['https://h/blog', 'https://h/blog/api/oauth/authorize'],
    ['https://h/blog/', 'https://h/blog/api/oauth/authorize']
  ];

  for (const [siteUrl, expected] of cases) {
    it(`targets ${expected} for site URL ${siteUrl}`, () => {
      const url = new URL(buildOAuthReturnUrl(OAUTH_STATE, siteUrl) ?? '');
      assert.equal(`${url.origin}${url.pathname}`, expected);
    });
  }

  it('carries the pending OAuth request', () => {
    const url = new URL(buildOAuthReturnUrl(OAUTH_STATE, 'https://h/blog') ?? '');
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      response_type: 'code',
      client_id: 'openhive_chat',
      redirect_uri: 'https://openhive.chat/_oauth/hive',
      scope: 'openid profile',
      state: 'xyz'
    });
  });

  it('omits the optional scope and state', () => {
    const url = new URL(
      buildOAuthReturnUrl({ clientId: 'c', redirectUri: 'https://c/cb' }, 'https://h') ?? ''
    );
    assert.deepEqual([...url.searchParams.keys()], ['response_type', 'client_id', 'redirect_uri']);
  });

  it('returns null without a pending OAuth request', () => {
    assert.equal(buildOAuthReturnUrl(undefined, 'https://h/blog'), null);
  });
});
