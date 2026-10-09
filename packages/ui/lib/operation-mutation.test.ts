import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import {
  buildOperationMutationOptions,
  type OperationEffects,
  type OperationMutationConfig,
  type OperationToast
} from './operation-mutation.ts';

type Vars = { name: string };

function recordingEffects() {
  const toasts: OperationToast[] = [];
  const errors: { error: unknown; method: string; params: unknown }[] = [];
  const effects: OperationEffects = {
    notifySuccess: (toast) => toasts.push(toast),
    reportError: (error, method, params) => errors.push({ error, method, params }),
    logSuccess: () => {}
  };
  return { toasts, errors, effects };
}

function spyInvalidations(client: QueryClient): QueryKey[] {
  const invalidated: QueryKey[] = [];
  mock.method(client, 'invalidateQueries', async (filters: { queryKey: QueryKey }) => {
    invalidated.push(filters.queryKey);
  });
  return invalidated;
}

function mutate<TData, TContext>(
  client: QueryClient,
  config: OperationMutationConfig<Vars, TData, TContext>,
  effects: OperationEffects,
  variables: Vars
) {
  const observer = new MutationObserver(client, buildOperationMutationOptions(client, config, effects));
  return observer.mutate(variables);
}

const LIST_KEY = ['list'];

function listConfig(run: () => Promise<string>): OperationMutationConfig<Vars, string, string[] | undefined> {
  return {
    name: 'useAddToList',
    run,
    optimistic: ({ name }, client) => {
      const prev = client.getQueryData<string[]>(LIST_KEY);
      client.setQueryData(LIST_KEY, [...(prev ?? []), name]);
      return prev;
    },
    rollback: (prev, _vars, client) => client.setQueryData(LIST_KEY, prev),
    successToast: (_data, { name }) => ({ title: 'Added', description: `${name} added` }),
    invalidate: ({ name }) => [LIST_KEY, ['profile', name]]
  };
}

describe('buildOperationMutationOptions', () => {
  afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
  });

  it('on success keeps the optimistic write, toasts and refreshes the declared keys', async () => {
    const client = new QueryClient();
    client.setQueryData(LIST_KEY, ['alice']);
    const invalidated = spyInvalidations(client);
    const { toasts, errors, effects } = recordingEffects();

    const data = await mutate(
      client,
      listConfig(async () => 'tx-1'),
      effects,
      { name: 'bob' }
    );

    assert.equal(data, 'tx-1');
    assert.deepEqual(client.getQueryData(LIST_KEY), ['alice', 'bob']);
    assert.deepEqual(toasts, [{ title: 'Added', description: 'bob added' }]);
    assert.deepEqual(errors, []);
    assert.deepEqual(invalidated, [LIST_KEY, ['profile', 'bob']]);
  });

  it('on a failed broadcast rolls back, reports the error by name and does not toast success', async () => {
    const client = new QueryClient();
    client.setQueryData(LIST_KEY, ['alice']);
    spyInvalidations(client);
    const { toasts, errors, effects } = recordingEffects();
    const failure = new Error('broadcast rejected by node');

    await assert.rejects(
      mutate(
        client,
        listConfig(async () => Promise.reject(failure)),
        effects,
        { name: 'bob' }
      ),
      failure
    );

    assert.deepEqual(client.getQueryData(LIST_KEY), ['alice']);
    assert.deepEqual(toasts, []);
    assert.deepEqual(errors, [{ error: failure, method: 'useAddToList', params: { name: 'bob' } }]);
  });

  it('refreshes the declared keys on settle after a failure as well', async () => {
    const client = new QueryClient();
    const invalidated = spyInvalidations(client);
    const { effects } = recordingEffects();

    await assert.rejects(
      mutate(
        client,
        listConfig(async () => Promise.reject(new Error('x'))),
        effects,
        { name: 'bob' }
      )
    );

    assert.deepEqual(invalidated, [LIST_KEY, ['profile', 'bob']]);
  });

  it('defers the refresh to each configured delay', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const client = new QueryClient();
    const invalidated = spyInvalidations(client);
    const { effects } = recordingEffects();
    const config = { ...listConfig(async () => 'tx-1'), invalidateDelays: [4000, 10000] };

    await mutate(client, config, effects, { name: 'bob' });
    assert.deepEqual(invalidated, []);

    mock.timers.tick(4000);
    assert.equal(invalidated.length, 2);
    mock.timers.tick(6000);
    assert.equal(invalidated.length, 4);
  });

  it('leaves error reporting to the caller when reportErrors is false', async () => {
    const client = new QueryClient();
    const { errors, effects } = recordingEffects();
    const config = { ...listConfig(async () => Promise.reject(new Error('x'))), reportErrors: false };

    await assert.rejects(mutate(client, config, effects, { name: 'bob' }));

    assert.deepEqual(errors, []);
  });
});
