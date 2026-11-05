import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveChosenSessionTime, resolveSessionTimeConfig, sessionTimeChoices } from './session-time.ts';

describe('resolveSessionTimeConfig', () => {
  it('uses the configured value and maximum', () => {
    assert.deepEqual(resolveSessionTimeConfig('1800', '3600'), { deployment: 1800, max: 3600 });
  });

  it('defaults to 15 minutes and an 8 hour maximum when unset', () => {
    assert.deepEqual(resolveSessionTimeConfig(undefined, undefined), { deployment: 900, max: 28800 });
  });

  it('raises the default maximum to a longer deployment value', () => {
    assert.deepEqual(resolveSessionTimeConfig('64800', undefined), { deployment: 64800, max: 64800 });
  });

  it('caps the deployment value at the configured maximum', () => {
    assert.deepEqual(resolveSessionTimeConfig('64800', '3600'), { deployment: 3600, max: 3600 });
  });

  it('accepts exactly 30 days', () => {
    assert.deepEqual(resolveSessionTimeConfig('2592000', '2592000'), { deployment: 2592000, max: 2592000 });
  });

  for (const value of ['abc', '', '  ', '0', '-5', 'Infinity', '2592001', '1e20']) {
    it(`falls back to the defaults for ${JSON.stringify(value)}`, () => {
      assert.deepEqual(resolveSessionTimeConfig(value, value), { deployment: 900, max: 28800 });
    });
  }
});

describe('sessionTimeChoices', () => {
  it('offers 5 min, 15 min, 1 h and 8 h by default', () => {
    assert.deepEqual(sessionTimeChoices({ deployment: 900, max: 28800 }), [300, 900, 3600, 28800]);
  });

  it("adds the deployment's own value in order", () => {
    assert.deepEqual(sessionTimeChoices({ deployment: 1800, max: 28800 }), [300, 900, 1800, 3600, 28800]);
  });

  it('offers nothing above the maximum', () => {
    assert.deepEqual(sessionTimeChoices({ deployment: 900, max: 3600 }), [300, 900, 3600]);
    assert.deepEqual(sessionTimeChoices({ deployment: 300, max: 600 }), [300]);
  });
});

describe('resolveChosenSessionTime', () => {
  const config = { deployment: 900, max: 3600 };

  it("uses the deployment's value when nothing was chosen", () => {
    assert.equal(resolveChosenSessionTime(config, null), 900);
  });

  it('uses a choice it offers', () => {
    assert.equal(resolveChosenSessionTime(config, 3600), 3600);
    assert.equal(resolveChosenSessionTime(config, 300), 300);
  });

  it('ignores a choice above the maximum, as one made before the operator lowered it', () => {
    assert.equal(resolveChosenSessionTime(config, 28800), 900);
  });

  for (const chosen of [1234, '3600', -300, Number.NaN, {}]) {
    it(`ignores ${JSON.stringify(chosen)}, which is not offered`, () => {
      assert.equal(resolveChosenSessionTime(config, chosen), 900);
    });
  }
});
