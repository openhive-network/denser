import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FypApiError, getFypFeedPage, retryFypRead } from './fyp-api.ts';
import { FYP_PAGE_SIZE, nextFypPage } from './fyp-paging.ts';

const BASE_URL = 'https://fyp.example.org/haf-fyp-api/';
// Larger than Number.MAX_SAFE_INTEGER: it would not survive as a JSON number
const POST_ID = '477020413881221127';

const post = (permlink: string) => ({
  author: 'alice',
  permlink,
  body: 'text',
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
    assert.equal(url.searchParams.get('truncate_body'), '300');
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
