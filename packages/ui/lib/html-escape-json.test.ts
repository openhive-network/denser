import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonForScript, htmlEscapeJsonString } from './html-escape-json.ts';

describe('htmlEscapeJsonString', () => {
  it('escapes < to prevent script breakout', () => {
    assert.equal(htmlEscapeJsonString('</script>'), '\\u003c/script\\u003e');
  });

  it('escapes > to prevent comment issues', () => {
    assert.equal(htmlEscapeJsonString('-->'), '--\\u003e');
  });

  it('escapes & to prevent HTML entity injection', () => {
    assert.equal(htmlEscapeJsonString('foo&bar'), 'foo\\u0026bar');
  });

  it('escapes line separator U+2028', () => {
    assert.equal(htmlEscapeJsonString('line\u2028break'), 'line\\u2028break');
  });

  it('escapes paragraph separator U+2029', () => {
    assert.equal(htmlEscapeJsonString('para\u2029break'), 'para\\u2029break');
  });

  it('leaves safe characters unchanged', () => {
    assert.equal(htmlEscapeJsonString('hello world 123'), 'hello world 123');
  });
});

describe('safeJsonForScript', () => {
  it('escapes < and > to prevent script breakout', () => {
    assert.equal(
      safeJsonForScript('</script><script>alert(1)'),
      '"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)"'
    );
  });

  it('escapes & to prevent HTML entity injection', () => {
    assert.equal(safeJsonForScript('foo&bar'), '"foo\\u0026bar"');
  });

  it('escapes line terminators', () => {
    assert.equal(safeJsonForScript('line\u2028break\u2029end'), '"line\\u2028break\\u2029end"');
  });

  it('produces valid JavaScript that evaluates to original value', () => {
    const original = 'test</script>&\u2028value';
    const escaped = safeJsonForScript(original);
    // eval is safe here - we control the input
    // eslint-disable-next-line no-eval
    assert.equal(eval(escaped), original);
  });

  it('handles null', () => {
    assert.equal(safeJsonForScript(null), 'null');
  });

  it('escapes string values nested in objects', () => {
    assert.equal(
      safeJsonForScript({ key: '<script>test</script>' }),
      '{"key":"\\u003cscript\\u003etest\\u003c/script\\u003e"}'
    );
  });

  it('escapes string values nested in arrays', () => {
    assert.equal(safeJsonForScript(['<', '>', '&']), '["\\u003c","\\u003e","\\u0026"]');
  });
});
