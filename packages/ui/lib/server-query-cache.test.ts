import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver, QueryCache, QueryClient, QueryObserver } from '@tanstack/react-query';
import { ServerMutationCache, ServerQueryCache } from './server-query-cache.ts';

const ONE_HOUR = 3_600_000;

let setTimeoutSpy: ReturnType<typeof mock.method>;

function longTimerCount(): number {
  return setTimeoutSpy.mock.calls.filter((call) => Number(call.arguments[1]) >= ONE_HOUR).length;
}

function makeServerClient(): QueryClient {
  return new QueryClient({ queryCache: new ServerQueryCache(), mutationCache: new ServerMutationCache() });
}

function observeDisabledQuery(client: QueryClient): void {
  const observer = new QueryObserver(client, {
    queryKey: ['reblogged-by'],
    queryFn: async () => true,
    enabled: false,
    gcTime: ONE_HOUR
  });
  const unsubscribe = observer.subscribe(() => {});
  unsubscribe();
}

describe('ServerQueryCache', () => {
  beforeEach(() => {
    setTimeoutSpy = mock.method(globalThis, 'setTimeout');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('a plain QueryCache schedules a GC timer for a query with a finite gcTime', () => {
    const client = new QueryClient({ queryCache: new QueryCache() });
    observeDisabledQuery(client);

    assert.ok(longTimerCount() > 0);
    client.clear();
  });

  it('schedules no GC timer for a query whose options set gcTime: 3_600_000', () => {
    const client = makeServerClient();
    observeDisabledQuery(client);

    assert.equal(longTimerCount(), 0);
    assert.equal(client.getQueryCache().find({ queryKey: ['reblogged-by'] })?.gcTime, Infinity);
  });

  it('keeps gcTime at Infinity when a fetched query is given a finite gcTime', async () => {
    const client = makeServerClient();
    await client.prefetchQuery({ queryKey: ['post'], queryFn: async () => 'body', gcTime: ONE_HOUR });
    client.setQueryDefaults(['post'], { gcTime: ONE_HOUR });
    observeDisabledQuery(client);

    assert.equal(longTimerCount(), 0);
    assert.equal(client.getQueryCache().find({ queryKey: ['post'] })?.gcTime, Infinity);
  });
});

describe('ServerMutationCache', () => {
  beforeEach(() => {
    setTimeoutSpy = mock.method(globalThis, 'setTimeout');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('schedules no GC timer for a mutation whose options set a finite gcTime', async () => {
    const client = makeServerClient();
    const observer = new MutationObserver(client, { mutationFn: async () => 'done', gcTime: ONE_HOUR });
    await observer.mutate();

    assert.equal(longTimerCount(), 0);
    assert.equal(client.getMutationCache().getAll()[0]?.gcTime, Infinity);
  });
});
