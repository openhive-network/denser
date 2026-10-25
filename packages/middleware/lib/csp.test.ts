import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { PICKER_API_NODES } from '../../ui/config/api-node-picker.ts';

// csp.ts imports the picker list and chat config the way the apps' bundler resolves it, without the extension
// node's type stripping needs.
const UI_CONFIG_MODULES = new Set(['@hive/ui/config/api-node-picker', '@hive/ui/config/chat']);
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(UI_CONFIG_MODULES.has(specifier) ? `${specifier}.ts` : specifier, context);
  }
});
const { buildCsp, generateNonce, parseNonce } = await import('./csp.ts');

const scriptSrcOf = (policy: string): string[] =>
  policy
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'script-src')
    ?.slice(1) ?? [];

const connectSrcOf = (policy: string): string[] =>
  policy
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'connect-src')
    ?.slice(1) ?? [];

const withAllowedApiNodes = (value: string | undefined, run: () => void) => {
  const saved = process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
  if (value === undefined) delete process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
  else process.env.REACT_APP_ALLOWED_HIVE_API_NODES = value;
  try {
    run();
  } finally {
    if (saved === undefined) delete process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
    else process.env.REACT_APP_ALLOWED_HIVE_API_NODES = saved;
  }
};

const withNodeEnv = (value: string, run: () => void) => {
  const env = process.env as Record<string, string | undefined>;
  const saved = env.NODE_ENV;
  env.NODE_ENV = value;
  try {
    run();
  } finally {
    env.NODE_ENV = saved;
  }
};

test('script-src allows the given nonce and what it loads, with no inline or eval escape hatch', () => {
  withNodeEnv('production', () => {
    const scriptSrc = scriptSrcOf(buildCsp({}, 'bm9uY2U='));
    assert.ok(scriptSrc.includes("'nonce-bm9uY2U='"), scriptSrc.join(' '));
    assert.ok(scriptSrc.includes("'strict-dynamic'"));
    assert.ok(scriptSrc.includes("'wasm-unsafe-eval'"));
    assert.ok(!scriptSrc.includes("'unsafe-inline'"));
    assert.ok(!scriptSrc.includes("'unsafe-eval'"));
  });
});

test("script-src adds 'unsafe-eval' for next dev only", () => {
  withNodeEnv('development', () => {
    assert.ok(scriptSrcOf(buildCsp({}, 'bm9uY2U=')).includes("'unsafe-eval'"));
  });
});

test('connect-src allows every node the node picker offers', () => {
  withAllowedApiNodes(undefined, () => {
    const connectSrc = connectSrcOf(buildCsp({}, 'bm9uY2U='));
    for (const node of PICKER_API_NODES) assert.ok(connectSrc.includes(node), `${node} missing: ${connectSrc.join(' ')}`);
  });
});

test('connect-src adds the picker nodes to the configured allowed API nodes', () => {
  withAllowedApiNodes('https://api.dev.openhive.network,https://api.hive.blog', () => {
    const connectSrc = connectSrcOf(buildCsp({}, 'bm9uY2U='));
    assert.ok(connectSrc.includes('https://api.dev.openhive.network'), connectSrc.join(' '));
    for (const node of PICKER_API_NODES) assert.ok(connectSrc.includes(node), `${node} missing: ${connectSrc.join(' ')}`);
  });
});

test('style-src keeps its inline styles', () => {
  assert.match(buildCsp({}, 'bm9uY2U='), /style-src 'self' 'unsafe-inline'(;|$)/);
});

test('each generated nonce is new and passes parseNonce', () => {
  const nonces = new Set(Array.from({ length: 50 }, generateNonce));
  assert.equal(nonces.size, 50);
  for (const nonce of nonces) assert.equal(parseNonce(nonce), nonce);
});

test('parseNonce refuses a missing value and anything that is not base64', () => {
  assert.equal(parseNonce(null), undefined);
  assert.equal(parseNonce(undefined), undefined);
  assert.equal(parseNonce(''), undefined);
  assert.equal(parseNonce('abc"><script>alert(1)</script>'), undefined);
  assert.equal(parseNonce('a b'), undefined);
});

const frameSrcOf = (policy: string): string[] =>
  policy
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'frame-src')
    ?.slice(1) ?? [];

const withChatEnv = (values: Record<string, string>, run: () => void) => {
  const keys = [
    'REACT_APP_CHAT_PROVIDER',
    'REACT_APP_MATRIX_ELEMENT_URL',
    'REACT_APP_MATRIX_HOMESERVER_URL',
    'REACT_APP_MATRIX_CHAT_CLIENT',
    'REACT_APP_SITE_DOMAIN'
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (key in values) process.env[key] = values[key];
    else delete process.env[key];
  }
  try {
    run();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};

const BLOG_FRAME_SRC = { frameSrc: ['https://www.youtube.com', 'https://openhive.chat'] };

test("frame-src admits Element's and the homeserver's origins in Matrix mode, keeping the app's list and its own origin", () => {
  withChatEnv(
    {
      REACT_APP_CHAT_PROVIDER: 'matrix',
      REACT_APP_MATRIX_CHAT_CLIENT: 'element',
      REACT_APP_MATRIX_ELEMENT_URL: 'https://chat.example.org/',
      REACT_APP_MATRIX_HOMESERVER_URL: 'https://matrix.example.org/',
      REACT_APP_SITE_DOMAIN: 'https://denser.example.org/blog'
    },
    () => {
      const frameSrc = frameSrcOf(buildCsp(BLOG_FRAME_SRC, 'bm9uY2U='));
      assert.ok(frameSrc.includes('https://chat.example.org'), frameSrc.join(' '));
      assert.ok(frameSrc.includes('https://matrix.example.org'), frameSrc.join(' '));
      assert.ok(frameSrc.includes('https://www.youtube.com'), frameSrc.join(' '));
      assert.ok(frameSrc.includes('https://denser.example.org'), frameSrc.join(' '));
    }
  );
});

test("frame-src keeps 'self' next to Element for an app with no frame list", () => {
  withChatEnv(
    {
      REACT_APP_CHAT_PROVIDER: 'matrix',
      REACT_APP_MATRIX_CHAT_CLIENT: 'element',
      REACT_APP_MATRIX_ELEMENT_URL: 'https://chat.example.org'
    },
    () => {
      assert.deepEqual(frameSrcOf(buildCsp({}, 'bm9uY2U=')), ['https://chat.example.org', "'self'"]);
    }
  );
});

test('frame-src lists Element and the homeserver once when they share an origin', () => {
  withChatEnv(
    {
      REACT_APP_CHAT_PROVIDER: 'matrix',
      REACT_APP_MATRIX_CHAT_CLIENT: 'element',
      REACT_APP_MATRIX_ELEMENT_URL: 'https://example.org/element',
      REACT_APP_MATRIX_HOMESERVER_URL: 'https://example.org'
    },
    () => {
      assert.deepEqual(frameSrcOf(buildCsp({}, 'bm9uY2U=')), ['https://example.org', "'self'"]);
    }
  );
});

test('frame-src leaves Matrix out unless the chat provider is Matrix', () => {
  withChatEnv(
    {
      REACT_APP_MATRIX_ELEMENT_URL: 'https://chat.example.org',
      REACT_APP_MATRIX_HOMESERVER_URL: 'https://matrix.example.org'
    },
    () => {
      const frameSrc = frameSrcOf(buildCsp(BLOG_FRAME_SRC, 'bm9uY2U='));
      assert.ok(!frameSrc.includes('https://chat.example.org'), frameSrc.join(' '));
      assert.ok(!frameSrc.includes('https://matrix.example.org'), frameSrc.join(' '));
      assert.ok(frameSrc.includes('https://openhive.chat'), frameSrc.join(' '));
    }
  );
});

test("the native chat client reaches the homeserver from the page (connect-src) and frames no Matrix origin", () => {
  withChatEnv(
    {
      REACT_APP_CHAT_PROVIDER: 'matrix',
      REACT_APP_MATRIX_ELEMENT_URL: 'https://chat.example.org',
      REACT_APP_MATRIX_HOMESERVER_URL: 'https://matrix.example.org/'
    },
    () => {
      const policy = buildCsp(BLOG_FRAME_SRC, 'bm9uY2U=');
      assert.ok(connectSrcOf(policy).includes('https://matrix.example.org'), connectSrcOf(policy).join(' '));
      const frameSrc = frameSrcOf(policy);
      assert.ok(!frameSrc.includes('https://chat.example.org'), frameSrc.join(' '));
      assert.ok(!frameSrc.includes('https://matrix.example.org'), frameSrc.join(' '));
    }
  );
});

test('connect-src leaves the homeserver out for Element and for Rocket.Chat', () => {
  for (const values of [
    { REACT_APP_CHAT_PROVIDER: 'matrix', REACT_APP_MATRIX_CHAT_CLIENT: 'element' },
    { REACT_APP_CHAT_PROVIDER: 'rocketchat' }
  ]) {
    withChatEnv({ ...values, REACT_APP_MATRIX_HOMESERVER_URL: 'https://matrix.example.org' }, () => {
      assert.ok(!connectSrcOf(buildCsp({}, 'bm9uY2U=')).includes('https://matrix.example.org'));
    });
  }
});

const withFypApiUrl = (value: string | undefined, run: () => void) => {
  const saved = process.env.REACT_APP_FYP_API_URL;
  if (value === undefined) delete process.env.REACT_APP_FYP_API_URL;
  else process.env.REACT_APP_FYP_API_URL = value;
  try {
    run();
  } finally {
    if (saved === undefined) delete process.env.REACT_APP_FYP_API_URL;
    else process.env.REACT_APP_FYP_API_URL = saved;
  }
};

test("connect-src admits the For You feed's origin when FYP_API_URL is set", () => {
  withFypApiUrl('https://fyp.example.org/haf-fyp-api', () => {
    const connectSrc = connectSrcOf(buildCsp({}, 'bm9uY2U='));
    assert.ok(connectSrc.includes('https://fyp.example.org'), connectSrc.join(' '));
  });
});

test('connect-src has no For You origin when FYP_API_URL is unset, empty or invalid', () => {
  for (const value of [undefined, '', 'not a url']) {
    withFypApiUrl(value, () => {
      const withoutFyp = connectSrcOf(buildCsp({}, 'bm9uY2U='));
      withFypApiUrl(undefined, () => {
        assert.deepEqual(withoutFyp, connectSrcOf(buildCsp({}, 'bm9uY2U=')));
      });
      assert.ok(!withoutFyp.includes('https://fyp.example.org'), withoutFyp.join(' '));
    });
  }
});

test('connect-src admits every hivemind REST node of HIVEMIND_REST_NODES, skipping invalid entries', () => {
  const saved = process.env.REACT_APP_HIVEMIND_REST_NODES;
  process.env.REACT_APP_HIVEMIND_REST_NODES = 'https://hm1.example.org/ not-a-url,https://hm2.example.org';
  try {
    const connectSrc = connectSrcOf(buildCsp({}, 'bm9uY2U='));
    assert.ok(connectSrc.includes('https://hm1.example.org'), connectSrc.join(' '));
    assert.ok(connectSrc.includes('https://hm2.example.org'), connectSrc.join(' '));
    assert.ok(!connectSrc.includes('not-a-url'), connectSrc.join(' '));
  } finally {
    if (saved === undefined) delete process.env.REACT_APP_HIVEMIND_REST_NODES;
    else process.env.REACT_APP_HIVEMIND_REST_NODES = saved;
  }
});
