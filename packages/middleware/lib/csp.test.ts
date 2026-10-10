import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsp, generateNonce, parseNonce } from './csp.ts';

const scriptSrcOf = (policy: string): string[] =>
  policy
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === 'script-src')
    ?.slice(1) ?? [];

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
