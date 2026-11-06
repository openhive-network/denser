import { describe, it } from 'mocha';
import { expect } from 'chai';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';
import {
  createVoteFreeSupport,
  discussionWithObserverVotes,
  isUnknownMethodError,
  readVoteFree,
  withObserverVote
} from './vote-free-posts';

const NODE = 'https://api.example';
const OTHER_NODE = 'https://other.example';

/** hivemind's answer to a method it lacks, as an older node gives it for `bridge.get_post_v2`. */
const unknownMethod = (endpoint?: string) =>
  new JsonRpcApiError(
    'bridge.get_post_v2',
    {
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32602, message: 'Assert Exception:unknown method: bridge_apiget_post_v2' }
    },
    endpoint
  );

const postMissing = new JsonRpcApiError('bridge.get_post_v2', {
  error: { code: -32602, message: 'Assert Exception:Post @nobody/missing does not exist' }
});

const transportFailure = new ReadTransportError('HTTP 504', {
  method: 'POST',
  endpoint: NODE,
  url: '',
  timeout: 1000,
  responseType: 'json'
});

const entry = (fields: Partial<Entry>) => ({ author: 'alice', permlink: 'p', ...fields }) as Entry;

describe('isUnknownMethodError', () => {
  it("takes hivemind's unknown-method assertion and JSON-RPC's method not found", () => {
    expect(isUnknownMethodError(unknownMethod())).to.equal(true);
    expect(isUnknownMethodError(new JsonRpcApiError('lite.get_post_v2', { error: { code: -32601, message: 'Method not found' } }))).to.equal(true);
  });

  it('takes no other answer of the method, nor a transport failure, for one', () => {
    expect(isUnknownMethodError(postMissing)).to.equal(false);
    expect(isUnknownMethodError(transportFailure)).to.equal(false);
    expect(isUnknownMethodError(new Error('unknown method'))).to.equal(false);
  });
});

describe('readVoteFree', () => {
  const reader = () => {
    const calls: string[] = [];
    const support = createVoteFreeSupport();
    const read = (node: string, voteFree: () => Promise<string>) =>
      readVoteFree(
        support,
        node,
        () => {
          calls.push(`v2 ${node}`);
          return voteFree();
        },
        async () => {
          calls.push(`stock ${node}`);
          return 'stock';
        }
      );
    return { calls, support, read };
  };

  it('reads the vote-free form from a node that serves it', async () => {
    const { calls, read } = reader();

    expect(await read(NODE, async () => 'vote-free')).to.equal('vote-free');
    expect(await read(NODE, async () => 'vote-free')).to.equal('vote-free');
    expect(calls).to.deep.equal([`v2 ${NODE}`, `v2 ${NODE}`]);
  });

  it('reads the stock form after "unknown method", and only that from then on on that node', async () => {
    const { calls, read } = reader();

    expect(await read(NODE, () => Promise.reject(unknownMethod()))).to.equal('stock');
    expect(await read(NODE, async () => 'vote-free')).to.equal('stock');
    expect(await read(OTHER_NODE, async () => 'vote-free')).to.equal('vote-free');
    expect(calls).to.deep.equal([`v2 ${NODE}`, `stock ${NODE}`, `stock ${NODE}`, `v2 ${OTHER_NODE}`]);
  });

  it('marks the node that answered "unknown method", which failover may have asked in its place', async () => {
    const { support, read } = reader();

    await read(NODE, () => Promise.reject(unknownMethod(OTHER_NODE)));

    expect(support.lacks(OTHER_NODE)).to.equal(true);
    expect(support.lacks(NODE)).to.equal(false);
  });

  it('throws any other failure without marking the node', async () => {
    const { calls, support, read } = reader();

    const missing = await read(NODE, () => Promise.reject(postMissing)).catch((error: unknown) => error);
    const failed = await read(NODE, () => Promise.reject(transportFailure)).catch((error: unknown) => error);

    expect(missing).to.equal(postMissing);
    expect(failed).to.equal(transportFailure);
    expect(support.lacks(NODE)).to.equal(false);
    expect(calls).to.deep.equal([`v2 ${NODE}`, `v2 ${NODE}`]);
  });
});

describe('withObserverVote', () => {
  it("gives a vote-free entry its observer and the observer's vote, null when it carries none", () => {
    const vote = { rshares: 10, percent: 10000 };

    expect(withObserverVote(entry({ observer_vote: vote }), 'bob')).to.deep.equal(
      entry({ observer_vote: vote, _observer: 'bob' })
    );
    expect(withObserverVote(entry({}), 'bob')).to.deep.equal(entry({ observer_vote: null, _observer: 'bob' }));
  });

  it('leaves an entry with its votes as it is', () => {
    const stock = entry({ active_votes: [{ voter: 'bob', rshares: 10 }] });

    expect(withObserverVote(stock, 'bob')).to.equal(stock);
  });

  it('keeps the keys of a discussion', () => {
    expect(discussionWithObserverVotes({ 'alice/p': entry({}) }, 'bob')).to.deep.equal({
      'alice/p': entry({ observer_vote: null, _observer: 'bob' })
    });
    expect(discussionWithObserverVotes(null, 'bob')).to.equal(null);
  });
});
