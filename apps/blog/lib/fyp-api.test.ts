import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FypApiError, getFypFeedPage, retryFypRead } from './fyp-api.ts';
import { FYP_PAGE_SIZE, nextFypPage } from './fyp-paging.ts';

const BASE_URL = 'https://fyp.example.org/haf-fyp-api/';
// Larger than Number.MAX_SAFE_INTEGER: it would not survive as a JSON number
const POST_ID = '477020413881221127';
const TRUNCATED_BODY_LENGTH = 1000;

const IMAGE = '![img.webp](https://cdn.liketu.com/liketu/trina77/lkt-mvqaj2dw-2xogw446/img.webp)\n\n';
const TEXT = '带着一群孩子到家已经四点半，我便马不停蹄准备晚餐。';

/** `opening` followed by text, cut like haf_fyp cuts a body. */
const cutBody = (opening: string) => (opening + 'x'.repeat(TRUNCATED_BODY_LENGTH)).slice(0, TRUNCATED_BODY_LENGTH);

const post = (permlink: string, body = 'text') => ({
  author: 'alice',
  permlink,
  body,
  fyp: { rank: 1, source: 'personalized', post_id: POST_ID, algorithm_version: '1.1.0' }
});

const realFetch = globalThis.fetch;
const requested: URL[] = [];

function serve(answer: (url: URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    requested.push(url);
    return answer(url, init);
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
  requested.length = 0;
});

describe('getFypFeedPage', () => {
  it("requests the account's page with the page size and truncated bodies", async () => {
    serve(async () => Response.json([post('a')]));
    await getFypFeedPage(BASE_URL, 'alice', 3);

    const [url] = requested;
    assert.equal(url.origin + url.pathname, 'https://fyp.example.org/haf-fyp-api/v1/fyp/feed/alice');
    assert.equal(url.searchParams.get('page'), '3');
    assert.equal(url.searchParams.get('page-size'), String(FYP_PAGE_SIZE));
    assert.equal(url.searchParams.get('truncate_body'), String(TRUNCATED_BODY_LENGTH));
  });

  it('drops a markdown image, link or HTML tag the cut left unfinished', async () => {
    const opening = IMAGE.repeat(3) + TEXT + '\n\n';
    const cuts = [
      '![img_20261025_181',
      '![download.gif](',
      '![1001998356-bf4307b60d22.webp](https://',
      '[Source](https://chatgpt.com/s/m_6adf7f393',
      '<img src="https://images.hive.blog/a.png'
    ];
    const bodies = cuts.map((cut) => opening + 'y'.repeat(TRUNCATED_BODY_LENGTH - opening.length - cut.length) + cut);
    serve(async () => Response.json(bodies.map((body, i) => post(String(i), body))));
    const page = await getFypFeedPage(BASE_URL, 'alice', 1);

    for (const [i, entry] of page.entries()) {
      assert.equal(entry.body, bodies[i].slice(0, -cuts[i].length));
    }
  });

  it('keeps complete markup at the end of a cut body and every short body', async () => {
    const complete = cutBody('').slice(0, -IMAGE.length) + IMAGE;
    const short = 'A short post ending in ![img](https://example.com/a.png';
    serve(async () => Response.json([post('a', complete), post('b', short), post('c', cutBody(TEXT))]));
    const page = await getFypFeedPage(BASE_URL, 'alice', 1);

    assert.deepEqual(
      page.map((entry) => entry.body),
      [complete, short, cutBody(TEXT)]
    );
  });

  it('gives a post opening with images a summary of its text, not a markdown fragment', async () => {
    const { getPostSummary } = await import('./post-summary.ts');
    const body = cutBody(IMAGE.repeat(3) + TEXT + '\n\n' + IMAGE.repeat(10));
    serve(async () => Response.json([post('a', body)]));
    const [entry] = await getFypFeedPage(BASE_URL, 'alice', 1);

    assert.equal(getPostSummary(entry.json_metadata, entry.body), TEXT);
  });

  it('keeps fyp.post_id as the string the API sent', async () => {
    serve(async () => Response.json([post('a'), post('b')]));
    const page = await getFypFeedPage(BASE_URL, 'alice', 1);

    assert.deepEqual(
      page.map((entry) => entry.permlink),
      ['a', 'b']
    );
    assert.equal(page[0].fyp.post_id, POST_ID);
  });

  it('rejects with FypApiError on an HTTP error', async () => {
    serve(async () => new Response('down', { status: 502 }));
    await assert.rejects(getFypFeedPage(BASE_URL, 'alice', 1), FypApiError);
  });

  it('rejects with FypApiError on a body that is not a list of posts', async () => {
    serve(async () => Response.json({ posts: [post('a')] }));
    await assert.rejects(getFypFeedPage(BASE_URL, 'alice', 1), FypApiError);

    serve(async () => Response.json([{ author: 'alice', permlink: 'a', fyp: { post_id: 1 } }]));
    await assert.rejects(getFypFeedPage(BASE_URL, 'alice', 1), FypApiError);
  });

  it('rejects with FypApiError once the timeout passes without an answer', async () => {
    serve(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );
    const started = Date.now();
    await assert.rejects(getFypFeedPage(BASE_URL, 'alice', 1, 50), FypApiError);
    assert.ok(Date.now() - started < 5_000);
  });
});

describe('nextFypPage', () => {
  it('asks for the next page after a full one', () => {
    assert.equal(nextFypPage(new Array(FYP_PAGE_SIZE).fill(post('a')), 2), 3);
  });

  it('ends the feed after a short page', () => {
    assert.equal(nextFypPage(new Array(FYP_PAGE_SIZE - 1).fill(post('a')), 2), undefined);
    assert.equal(nextFypPage([], 1), undefined);
  });
});

/** The error `getFypFeedPage` rejects with when the API answers as `answer` does. */
async function feedError(answer: () => Promise<Response>): Promise<unknown> {
  serve(answer);
  return getFypFeedPage(BASE_URL, 'alice', 1).then(
    () => assert.fail('the read succeeded'),
    (error: unknown) => error
  );
}

describe('retryFypRead', () => {
  it('does not retry when haf_fyp is unreachable or answers a server error', async () => {
    const unreachable = await feedError(() => Promise.reject(new TypeError('fetch failed')));
    assert.equal(retryFypRead(0, unreachable), false);
    assert.equal(retryFypRead(0, await feedError(async () => new Response('down', { status: 503 }))), false);
  });

  it('retries any other failure once', async () => {
    const notFound = await feedError(async () => new Response('missing', { status: 404 }));
    const badBody = await feedError(async () => Response.json({ posts: [] }));
    for (const error of [notFound, badBody, new Error('bridge API failed')]) {
      assert.equal(retryFypRead(0, error), true);
      assert.equal(retryFypRead(1, error), false);
    }
  });
});
