import { describe, it } from 'mocha';
import { expect } from 'chai';
import type { IVoteListItem } from '@hive/common-hiveio-packages/wax';
import { ReadTransportError } from './read-transport';
import {
  buildListVotesBatch,
  createViewerVoteBatcher,
  listVotesNodeOf,
  parseListVotesBatch,
  type IViewerVoteAnswer,
  type IViewerVoteTarget
} from './viewer-votes-batch';

const NODE = 'https://api.example';
const OTHER_NODE = 'https://other.example';
const VIEWER = 'alice';

const target = (permlink: string, author = 'bob'): IViewerVoteTarget => ({ author, permlink, viewer: VIEWER });

const vote = (author: string, permlink: string, voter: string, percent: number): IVoteListItem => ({
  id: 1,
  voter,
  author,
  permlink,
  weight: '1',
  rshares: 100,
  vote_percent: percent,
  last_update: '2026-11-06T00:00:00',
  num_changes: 0,
  _temporary: false
});

/** A node's answer to a batch: each call's first vote in `by_comment_voter` order, per `votes`. */
const batchAnswer = (batch: object[], votes: Record<string, IVoteListItem>): object[] =>
  batch.map((call) => {
    const { id, params } = call as { id: number; params: { start: [string, string, string] } };
    const [author, permlink] = params.start;
    const found = votes[`${author}/${permlink}`];
    return { jsonrpc: '2.0', id, result: { votes: found ? [found] : [] } };
  });

const rejected = (status: number) =>
  new ReadTransportError(`HTTP ${status}`, { method: 'POST', endpoint: NODE, url: '', timeout: 1000, responseType: 'json' }, status);

interface IHarness {
  lookUp: (target: IViewerVoteTarget) => Promise<IViewerVoteAnswer>;
  sent: { node: string; batch: object[] }[];
  single: IViewerVoteTarget[];
}

const harness = ({
  answer,
  node = () => NODE,
  maxBatchSize
}: {
  answer: (batch: object[]) => unknown;
  node?: () => string;
  maxBatchSize?: number;
}): IHarness => {
  const sent: IHarness['sent'] = [];
  const single: IViewerVoteTarget[] = [];
  const lookUp = createViewerVoteBatcher({
    nodeOf: async () => node(),
    send: async (to, batch) => {
      sent.push({ node: to, batch });
      return answer(batch);
    },
    lookUpOne: async (one) => {
      single.push(one);
      return { votes: [vote(one.author, one.permlink, one.viewer, 5000)] };
    },
    windowMs: 0,
    maxBatchSize
  });
  return { lookUp, sent, single };
};

describe('buildListVotesBatch', () => {
  it('asks list_votes for the first vote from the viewer on each post of the page, ids by index', () => {
    expect(buildListVotesBatch([target('one'), target('two', 'carol')])).to.deep.equal([
      {
        jsonrpc: '2.0',
        method: 'database_api.list_votes',
        params: { start: ['bob', 'one', VIEWER], limit: 1, order: 'by_comment_voter' },
        id: 0
      },
      {
        jsonrpc: '2.0',
        method: 'database_api.list_votes',
        params: { start: ['carol', 'two', VIEWER], limit: 1, order: 'by_comment_voter' },
        id: 1
      }
    ]);
  });
});

describe('parseListVotesBatch', () => {
  const targets = [target('one'), target('two'), target('three')];

  it("keeps only the viewer's vote on each post, whatever order the replies come in", () => {
    const answer = [
      { id: 2, result: { votes: [vote('bob', 'three', VIEWER, -2500)] } },
      // The viewer did not vote on "one": by_comment_voter lists the next vote, another post's.
      { id: 0, result: { votes: [vote('bob', 'one-more', 'zed', 10000)] } },
      { id: 1, result: { votes: [vote('bob', 'two', 'zed', 10000)] } }
    ];

    const results = parseListVotesBatch(answer, targets);

    expect(results?.map((result) => result?.votes.map(({ vote_percent }) => vote_percent))).to.deep.equal([
      [],
      [],
      [-2500]
    ]);
  });

  it('leaves a post whose call failed or got no reply unanswered', () => {
    const answer = [{ id: 0, error: { code: -32000, message: 'busy' } }, { id: 1, result: { votes: [] } }];

    expect(parseListVotesBatch(answer, targets)).to.deep.equal([undefined, { votes: [] }, undefined]);
  });

  it('is null for an answer that is no batch answer', () => {
    expect(parseListVotesBatch({ jsonrpc: '2.0', id: null, error: { message: 'batch not allowed' } }, targets)).to.equal(
      null
    );
  });
});

describe('createViewerVoteBatcher', () => {
  it("answers each card's lookup of a page from one batch request to the read node", async () => {
    const { lookUp, sent, single } = harness({
      answer: (batch) => batchAnswer(batch, { 'bob/two': vote('bob', 'two', VIEWER, 10000) })
    });

    const [one, two, three] = await Promise.all([lookUp(target('one')), lookUp(target('two')), lookUp(target('three'))]);

    expect(sent).to.have.length(1);
    expect(sent[0].node).to.equal(NODE);
    expect(sent[0].batch).to.have.length(3);
    expect(single).to.deep.equal([]);
    expect(one).to.deep.equal({ votes: [] });
    expect(two.votes.map(({ voter, vote_percent }) => [voter, vote_percent])).to.deep.equal([[VIEWER, 10000]]);
    expect(three).to.deep.equal({ votes: [] });
  });

  it('sends one call for a post looked up twice and answers both', async () => {
    const { lookUp, sent } = harness({ answer: (batch) => batchAnswer(batch, {}) });

    const answers = await Promise.all([lookUp(target('one')), lookUp(target('one')), lookUp(target('two'))]);

    expect(sent[0].batch).to.have.length(2);
    expect(answers).to.deep.equal([{ votes: [] }, { votes: [] }, { votes: [] }]);
  });

  it('splits a page longer than the batch size into several batches', async () => {
    const { lookUp, sent } = harness({ answer: (batch) => batchAnswer(batch, {}), maxBatchSize: 2 });

    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((permlink) => lookUp(target(permlink))));

    expect(sent.map(({ batch }) => batch.length)).to.deep.equal([2, 2]);
  });

  it('looks a lone post up on its own, without a batch', async () => {
    const { lookUp, sent, single } = harness({ answer: (batch) => batchAnswer(batch, {}) });

    await lookUp(target('one'));

    expect(sent).to.deep.equal([]);
    expect(single).to.deep.equal([target('one')]);
  });

  it('looks up on its own each post whose call in the batch failed', async () => {
    const { lookUp, single } = harness({
      answer: (batch) => [{ id: 0, error: { message: 'busy' } }, ...batchAnswer(batch, {}).slice(1)]
    });

    await Promise.all([lookUp(target('one')), lookUp(target('two'))]);

    expect(single).to.deep.equal([target('one')]);
  });

  it('sends the batch to the node the core set routes list_votes to, not the bridge node', async () => {
    const routes: Record<string, string> = { bridge: NODE, core: OTHER_NODE };
    const sent: string[] = [];
    const lookUp = createViewerVoteBatcher({
      nodeOf: listVotesNodeOf(async (setId) => routes[setId], () => NODE),
      send: async (to, batch) => {
        sent.push(to);
        return batchAnswer(batch, {});
      },
      lookUpOne: async () => ({ votes: [] }),
      windowMs: 0
    });

    await Promise.all([lookUp(target('one')), lookUp(target('two'))]);

    expect(sent).to.deep.equal([OTHER_NODE]);
  });

  it('sends the batch to the default node while the core set names none', async () => {
    const nodeOf = listVotesNodeOf(async () => undefined, () => OTHER_NODE);

    expect(await nodeOf()).to.equal(OTHER_NODE);
  });

  for (const [rejection, answer] of [
    ['answers no array', () => ({ jsonrpc: '2.0', id: null, error: { message: 'batch requests are not allowed' } })],
    [
      'answers every call with an error',
      (batch: object[]) => batch.map((_call, id) => ({ jsonrpc: '2.0', id, error: { code: -32003, message: 'lock' } }))
    ],
    [
      'answers 400',
      () => {
        throw rejected(400);
      }
    ]
  ] as const) {
    it(`looks votes up card by card on a node that ${rejection}, and sends it no more batches`, async () => {
      let node = NODE;
      const { lookUp, sent, single } = harness({ answer, node: () => node });

      const votes = await Promise.all([lookUp(target('one')), lookUp(target('two'))]);
      await Promise.all([lookUp(target('three')), lookUp(target('four'))]);

      expect(sent).to.have.length(1);
      expect(single.map(({ permlink }) => permlink)).to.deep.equal(['one', 'two', 'three', 'four']);
      expect(votes.map(({ votes: [first] }) => first.vote_percent)).to.deep.equal([5000, 5000]);

      node = OTHER_NODE;
      await Promise.all([lookUp(target('five')), lookUp(target('six'))]);
      expect(sent.map(({ node: to }) => to)).to.deep.equal([NODE, OTHER_NODE]);
    });
  }

  it('looks votes up card by card when the batch fails on transport, and batches again later', async () => {
    let attempt = 0;
    const { lookUp, sent, single } = harness({
      answer: (batch) => {
        attempt += 1;
        if (attempt === 1) throw rejected(504);
        return batchAnswer(batch, {});
      }
    });

    await Promise.all([lookUp(target('one')), lookUp(target('two'))]);
    await Promise.all([lookUp(target('three')), lookUp(target('four'))]);

    expect(sent).to.have.length(2);
    expect(single.map(({ permlink }) => permlink)).to.deep.equal(['one', 'two']);
  });
});
