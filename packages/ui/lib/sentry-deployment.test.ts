import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sentryDeploymentOptions } from './sentry-deployment.ts';

describe('sentryDeploymentOptions', () => {
  it('sets both when both are given', () => {
    assert.deepEqual(sentryDeploymentOptions('integration', '0123abcd'), {
      environment: 'integration',
      release: '0123abcd'
    });
  });

  it('leaves out unset and empty values, so the SDK defaults apply', () => {
    for (const unset of [undefined, '']) {
      const options = sentryDeploymentOptions(unset, unset);
      assert.deepEqual(options, {});
      assert.equal('environment' in options, false);
      assert.equal('release' in options, false);
    }
  });

  it('sets each one independently', () => {
    assert.deepEqual(sentryDeploymentOptions('integration', ''), { environment: 'integration' });
    assert.deepEqual(sentryDeploymentOptions(undefined, 'abc'), { release: 'abc' });
  });
});
