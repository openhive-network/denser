import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PASSKEY_SIGNERS, parsePasskeySigners } from './passkey-signers.ts';

describe('parsePasskeySigners', () => {
  it('defaults to signer.hive.blog when unset or empty', () => {
    assert.deepEqual(parsePasskeySigners(undefined), ['https://signer.hive.blog']);
    assert.deepEqual(parsePasskeySigners(''), DEFAULT_PASSKEY_SIGNERS);
    assert.deepEqual(parsePasskeySigners('  '), DEFAULT_PASSKEY_SIGNERS);
  });

  it('reads one signer from a JSON array or a bare URL, as its origin', () => {
    assert.deepEqual(parsePasskeySigners('["https://signer.syncad.com"]'), ['https://signer.syncad.com']);
    assert.deepEqual(parsePasskeySigners('https://signer.syncad.com/sign/'), ['https://signer.syncad.com']);
  });

  it('reads several signers in order from JSON or a comma- or space-separated list', () => {
    const expected = ['https://signer.syncad.com', 'https://signer.hive.blog'];
    assert.deepEqual(
      parsePasskeySigners('["https://signer.syncad.com", "https://signer.hive.blog"]'),
      expected
    );
    assert.deepEqual(parsePasskeySigners('https://signer.syncad.com, https://signer.hive.blog'), expected);
    assert.deepEqual(parsePasskeySigners('https://signer.syncad.com https://signer.hive.blog'), expected);
  });

  it('drops repeats, non-https entries and non-strings, keeping the valid ones', () => {
    assert.deepEqual(
      parsePasskeySigners(
        '["https://a.example", "https://a.example/x", "http://b.example", "nope", 42, "https://c.example"]'
      ),
      ['https://a.example', 'https://c.example']
    );
  });

  it('accepts http on a loopback host only', () => {
    assert.deepEqual(parsePasskeySigners('http://localhost:5173'), ['http://localhost:5173']);
    assert.deepEqual(parsePasskeySigners('http://127.0.0.1:8080'), ['http://127.0.0.1:8080']);
  });

  it('falls back to the default when no entry is valid or the JSON is broken', () => {
    assert.deepEqual(
      parsePasskeySigners('["ftp://x.example", "javascript:alert(1)"]'),
      DEFAULT_PASSKEY_SIGNERS
    );
    assert.deepEqual(parsePasskeySigners('["https://a.example"'), DEFAULT_PASSKEY_SIGNERS);
    assert.deepEqual(parsePasskeySigners('{"signer": "https://a.example"}'), DEFAULT_PASSKEY_SIGNERS);
  });
});
