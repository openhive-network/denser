import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless workspace subpath:
// point `@hive/ui/…` at the package's TypeScript source.
const UI_ALIAS = '@hive/ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(UI_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(`../../ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
});

const {
  GOOGLE_DRIVE_AUTH_PATH,
  GOOGLE_DRIVE_REFRESH_PATH,
  googleDriveApiUrl,
  googleDriveCallbackUri,
  googleDriveServerOrigin
} = await import('./google-drive-urls.ts');

const PUBLIC_ORIGIN = 'https://denser.example.com';
const PROXY_HEADERS = { host: 'newblog', forwardedProto: 'http' };

/** The redirect URI the server repeats in the token exchange, for a deployment's site domain. */
function serverCallbackUri(siteDomain: string | undefined, headers = PROXY_HEADERS): string {
  return googleDriveCallbackUri(googleDriveServerOrigin(siteDomain, headers));
}

describe('Google Drive URLs', () => {
  const original = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = original;
    }
  });

  describe('served at the root', () => {
    it('keeps the API routes at the origin root', () => {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
      assert.equal(googleDriveApiUrl(PUBLIC_ORIGIN, GOOGLE_DRIVE_AUTH_PATH), `${PUBLIC_ORIGIN}/api/google-drive/auth`);
      assert.equal(
        googleDriveApiUrl(PUBLIC_ORIGIN, GOOGLE_DRIVE_REFRESH_PATH),
        `${PUBLIC_ORIGIN}/api/google-drive/refresh`
      );
      assert.equal(googleDriveCallbackUri(PUBLIC_ORIGIN), `${PUBLIC_ORIGIN}/api/google-drive/callback`);
    });

    it('rebuilds on the server the redirect URI the browser sent', () => {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
      assert.equal(serverCallbackUri(PUBLIC_ORIGIN), googleDriveCallbackUri(PUBLIC_ORIGIN));
    });
  });

  for (const basePath of ['/blog', '/wallet']) {
    describe(`served under ${basePath}`, () => {
      it('puts the API routes under the base path', () => {
        process.env.NEXT_PUBLIC_BASE_PATH = basePath;
        assert.equal(
          googleDriveApiUrl(PUBLIC_ORIGIN, GOOGLE_DRIVE_AUTH_PATH),
          `${PUBLIC_ORIGIN}${basePath}/api/google-drive/auth`
        );
        assert.equal(
          googleDriveApiUrl(PUBLIC_ORIGIN, GOOGLE_DRIVE_REFRESH_PATH),
          `${PUBLIC_ORIGIN}${basePath}/api/google-drive/refresh`
        );
        assert.equal(googleDriveCallbackUri(PUBLIC_ORIGIN), `${PUBLIC_ORIGIN}${basePath}/api/google-drive/callback`);
      });

      it('rebuilds on the server the redirect URI the browser sent, from a site domain with or without the path', () => {
        process.env.NEXT_PUBLIC_BASE_PATH = basePath;
        const browserRedirectUri = googleDriveCallbackUri(PUBLIC_ORIGIN);
        assert.equal(serverCallbackUri(PUBLIC_ORIGIN), browserRedirectUri);
        assert.equal(serverCallbackUri(`${PUBLIC_ORIGIN}${basePath}`), browserRedirectUri);
        assert.equal(serverCallbackUri(`${PUBLIC_ORIGIN}${basePath}/`), browserRedirectUri);
      });
    });
  }

  describe('server origin', () => {
    it('takes the site domain over the Host header the reverse proxy forwards', () => {
      assert.equal(googleDriveServerOrigin(`${PUBLIC_ORIGIN}/blog`, PROXY_HEADERS), PUBLIC_ORIGIN);
    });

    it('falls back to the request headers without a usable site domain', () => {
      const local = { host: 'localhost:3000', forwardedProto: 'http' };
      assert.equal(googleDriveServerOrigin(undefined, local), 'http://localhost:3000');
      assert.equal(googleDriveServerOrigin('not a url', local), 'http://localhost:3000');
    });

    it('assumes https when the proxy does not forward the scheme', () => {
      assert.equal(googleDriveServerOrigin(undefined, { host: 'denser.example.com' }), PUBLIC_ORIGIN);
    });
  });
});
