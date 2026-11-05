import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findChunkLoadError } from './chunk-load-error.ts';

function chunkLoadError(): Error {
  const error = new Error(
    'Failed to load chunk /wallet/_next/static/chunks/0d7iw5qk81n9w.js from module 46440: TypeError: Failed to fetch'
  );
  error.name = 'ChunkLoadError';
  return error;
}

describe('findChunkLoadError', () => {
  it("finds the bundler's chunk load failure itself", () => {
    const error = chunkLoadError();
    assert.equal(findChunkLoadError(error), error);
  });

  it('finds it as the cause of an error wrapping it', () => {
    const error = chunkLoadError();
    assert.equal(findChunkLoadError(new Error('Signing failed', { cause: error })), error);
  });

  it('leaves other errors, and the same text without the name, alone', () => {
    assert.equal(findChunkLoadError(new Error('Failed to load chunk /wallet/_next/static/chunks/a.js')), undefined);
    assert.equal(findChunkLoadError(new Error('missing required active authority')), undefined);
    assert.equal(findChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 1 failed.' }), undefined);
    assert.equal(findChunkLoadError('ChunkLoadError'), undefined);
  });
});
