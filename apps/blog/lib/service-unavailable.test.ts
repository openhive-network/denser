import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { ServiceUnavailableError, isServiceUnavailableError } = await import('./service-unavailable.ts');

describe('isServiceUnavailableError', () => {
  it('recognises the thrown error', () => {
    assert.equal(isServiceUnavailableError(new ServiceUnavailableError(new Error('socket hang up'))), true);
  });

  it('recognises what a client boundary receives for it in production: a generic error with its digest', () => {
    const thrown = new ServiceUnavailableError(new Error('socket hang up'));
    const received = Object.assign(new Error('An error occurred in the Server Components render.'), {
      digest: thrown.digest
    });
    assert.equal(isServiceUnavailableError(received), true);
  });

  it('gives each error its own digest', () => {
    assert.notEqual(new ServiceUnavailableError(null).digest, new ServiceUnavailableError(null).digest);
  });

  it('does not recognise other errors', () => {
    assert.equal(isServiceUnavailableError(new TypeError("Cannot read properties of undefined (reading 'body')")), false);
    assert.equal(
      isServiceUnavailableError(Object.assign(new Error('An error occurred in the Server Components render.'), { digest: '1234567890' })),
      false
    );
    assert.equal(isServiceUnavailableError(null), false);
    assert.equal(isServiceUnavailableError('ServiceUnavailableError'), false);
  });
});
