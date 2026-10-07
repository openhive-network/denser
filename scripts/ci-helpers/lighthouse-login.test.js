const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_OBSERVER, validObserver, logIn, observerRoutes } = require('./lighthouse-login');

// A puppeteer Page that records what logIn asks of it.
function recordingPage() {
  const calls = { cookies: [], newDocumentScripts: [] };
  return {
    calls,
    setCookie: async (...cookies) => calls.cookies.push(...cookies),
    evaluateOnNewDocument: async (fn, ...args) => calls.newDocumentScripts.push({ fn, args }),
  };
}

// Runs a script logIn registered as a page at `href` would, before its own scripts.
function runInDocument({ fn, args }, href) {
  const storage = new Map();
  const previous = globalThis.window;
  globalThis.window = { location: new URL(href), localStorage: { setItem: (key, value) => storage.set(key, String(value)) } };
  try {
    fn(...args);
  } finally {
    globalThis.window = previous;
  }
  return storage;
}

test('logIn sets the observer cookie the sign-in sets, for the whole site', async () => {
  const page = recordingPage();
  await logIn(page, 'https://denser.example', 'blocktrades');
  assert.deepEqual(page.calls.cookies, [
    { name: 'observer', value: 'blocktrades', url: 'https://denser.example', path: '/', sameSite: 'Lax', secure: true },
  ]);

  const plain = recordingPage();
  await logIn(plain, 'http://127.0.0.1:8000', 'gtg');
  assert.equal(plain.calls.cookies[0].secure, false, 'no Secure cookie on http');
});

test('logIn stores a Keychain posting-key user in localStorage on the site, and nowhere else', async () => {
  const page = recordingPage();
  await logIn(page, 'https://denser.example', 'blocktrades');
  assert.equal(page.calls.newDocumentScripts.length, 1);
  const [script] = page.calls.newDocumentScripts;

  const storage = runInDocument(script, 'https://denser.example/blog/trending');
  assert.deepEqual([...storage.keys()], ['user']);
  assert.deepEqual(JSON.parse(storage.get('user')), {
    isLoggedIn: true,
    username: 'blocktrades',
    avatarUrl: '',
    loginType: 'keychain',
    keyType: 'posting',
    authenticateOnBackend: false,
    chatAuthToken: '',
    oauthConsent: {},
    strict: false,
  });

  assert.equal(runInDocument(script, 'about:blank').size, 0, 'about:blank, where Lighthouse starts');
  assert.equal(runInDocument(script, 'https://images.hive.blog/u/gtg/avatar').size, 0, 'another origin');
});

test('observerRoutes names the observer in its routes and keeps their thresholds', () => {
  const limits = { 'wasm-transfer-bytes': 1070000 };
  assert.deepEqual(observerRoutes({ '/blog/trending': limits, '/blog/@{observer}/notifications': limits, '/wallet/@{observer}/transfers': limits }, 'gtg'), {
    '/blog/trending': limits,
    '/blog/@gtg/notifications': limits,
    '/wallet/@gtg/transfers': limits,
  });
});

test('the observer must be a Hive account name', () => {
  assert.equal(validObserver(DEFAULT_OBSERVER), 'blocktrades');
  assert.equal(validObserver('hive.blog-1'), 'hive.blog-1');
  for (const bad of [undefined, '', 'ab', 'Blocktrades', 'x/../y', 'a'.repeat(17), 'gtg; rm -rf /']) {
    assert.throws(() => validObserver(bad), /not a Hive account name/, String(bad));
  }
});
