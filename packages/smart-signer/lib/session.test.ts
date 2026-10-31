import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve. Each app loads its own
// copy of the modules (a query on their URLs), as each app's server does with its own env.
const MODULES: Record<string, string> = {
  '@smart-signer/lib/session': './session.ts',
  '@smart-signer/lib/set-cookie': './set-cookie.ts'
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const path = MODULES[specifier];
    if (!path) return nextResolve(specifier, context);
    const app = context.parentURL ? new URL(context.parentURL).search : '';
    return { url: `${new URL(path, import.meta.url).href}${app}`, shortCircuit: true };
  }
});

interface AppCookies {
  session: string;
  challenge: string;
}

let loads = 0;

/** The cookie names a server started with `appName` and `prefix` uses. */
async function cookiesOf(appName: string, prefix?: string): Promise<AppCookies> {
  process.env.REACT_APP_APP_NAME = appName;
  if (prefix === undefined) delete process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX;
  else process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX = prefix;
  const app = `?${appName}-${++loads}`;
  const { sessionOptions } = await import(`./session.ts${app}`);
  const { LOGIN_CHALLENGE_COOKIE } = await import(`./api-handlers/auth/challenge.ts${app}`);
  return { session: sessionOptions.cookieName, challenge: LOGIN_CHALLENGE_COOKIE };
}

describe('session cookie names', () => {
  afterEach(() => {
    delete process.env.REACT_APP_APP_NAME;
    delete process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX;
  });

  it('are prefixed by APP_NAME when no prefix is set, so separate apps keep separate sessions', async () => {
    assert.deepEqual(await cookiesOf('blog'), {
      session: 'blog_session',
      challenge: 'blog_login_challenge_server'
    });
    assert.deepEqual(await cookiesOf('wallet', ''), {
      session: 'wallet_session',
      challenge: 'wallet_login_challenge_server'
    });
  });

  it('are the same for the blog and the wallet given the same prefix', async () => {
    const blog = await cookiesOf('blog', 'denser_');
    const wallet = await cookiesOf('wallet', 'denser_');
    assert.deepEqual(blog, { session: 'denser_session', challenge: 'denser_login_challenge_server' });
    assert.deepEqual(wallet, blog);
  });

  it('refuse a prefix a cookie name cannot carry, or one not ending in _', async () => {
    await assert.rejects(cookiesOf('blog', 'denser_; Path=/blog'), /DENSER_SERVER_SESSION_COOKIE_PREFIX/);
    // The shared HTML caches would take `densersession` for no session at all
    await assert.rejects(cookiesOf('wallet', 'denser'), /DENSER_SERVER_SESSION_COOKIE_PREFIX/);
  });
});
