import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, FetchError } from './fetch-json.ts';

// fetchJson's abort timer would otherwise hold the test process open for its 30s default
const TIMEOUT_MS = 100;

function replyWith(response: Response): void {
  mock.method(globalThis, 'fetch', async () => response);
}

describe('fetchJson', () => {
  afterEach(() => mock.restoreAll());

  it('returns the parsed body of a 2xx JSON reply', async () => {
    replyWith(Response.json({ username: 'alice' }));
    assert.deepEqual(await fetchJson('/api/users/me', undefined, TIMEOUT_MS), { username: 'alice' });
  });

  it('fails a non-2xx JSON reply with the server error data', async () => {
    const body = { error: { message: 'Unauthorized' } };
    replyWith(Response.json(body, { status: 401 }));
    await assert.rejects(fetchJson('/api/auth/switch', undefined, TIMEOUT_MS), (error: unknown) => {
      assert.ok(error instanceof FetchError);
      assert.equal(error.response.status, 401);
      assert.deepEqual(error.data, body);
      return true;
    });
  });

  it('fails an HTML reply with a FetchError naming its content type, not a SyntaxError', async () => {
    replyWith(new Response('<!DOCTYPE html><html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    }));
    await assert.rejects(fetchJson('/api/auth/switch', undefined, TIMEOUT_MS), (error: unknown) => {
      assert.ok(error instanceof FetchError);
      assert.equal(error.response.status, 200);
      assert.match(error.message, /Status: 200\..*Expected a JSON response.*got text\/html/);
      assert.equal(error.data.error.message, error.message);
      return true;
    });
  });
});
