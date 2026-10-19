import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, FetchError, FetchTimeoutError } from './fetch-json.ts';

// fetchJson's abort timer would otherwise hold the test process open for its 30s default
const TIMEOUT_MS = 100;

function replyWith(response: Response): void {
  mock.method(globalThis, 'fetch', async () => response);
}

/** Stands in a fetch that answers with `response`, or never when it is null, recording the signal it was given. */
function replyOnSignal(response: Response | null): { signal?: AbortSignal } {
  const seen: { signal?: AbortSignal } = {};
  mock.method(globalThis, 'fetch', (_input: unknown, init?: RequestInit) => {
    seen.signal = init?.signal ?? undefined;
    if (response) return Promise.resolve(response);
    // Like a real fetch, an aborted request rejects with the signal's reason
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    });
  });
  return seen;
}

describe('fetchJson', () => {
  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

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

  it('fails a request with no answer within the timeout with a FetchTimeoutError naming the endpoint', async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    replyOnSignal(null);
    const request = fetchJson('/api/auth/login', { method: 'POST' }, 30_000);
    mock.timers.tick(30_000);
    await assert.rejects(request, (error: unknown) => {
      assert.ok(error instanceof FetchTimeoutError);
      assert.equal(error.url, '/api/auth/login');
      assert.equal(error.timeoutMs, 30_000);
      assert.equal(error.elapsedMs, 30_000);
      assert.equal(error.message, 'No response from /api/auth/login within 30000 ms');
      return true;
    });
  });

  it('clears its timeout once the request is answered', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const seen = replyOnSignal(Response.json({ ok: true }));
    await fetchJson('/api/auth/switch', undefined, 30_000);
    mock.timers.tick(30_000);
    assert.equal(seen.signal?.aborted, false);
  });

  it('clears its timeout when the request fails', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const seen = replyOnSignal(Response.json({ error: { message: 'Unauthorized' } }, { status: 401 }));
    await assert.rejects(fetchJson('/api/auth/switch', undefined, 30_000), FetchError);
    mock.timers.tick(30_000);
    assert.equal(seen.signal?.aborted, false);
  });
});
