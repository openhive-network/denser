import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBackPaginator, INITIAL_BACK_PAGINATION, type BackPaginationState } from './back-pagination.ts';

/** A paginator over pages the test settles by hand, recording its states */
function paginatorOverPages() {
  const states: BackPaginationState[] = [];
  const pages: Array<{ resolve: (more: boolean) => void; reject: (error: Error) => void }> = [];
  let requests = 0;
  const paginator = createBackPaginator(
    () => {
      requests++;
      return new Promise<boolean>((resolve, reject) => pages.push({ resolve, reject }));
    },
    (state) => states.push(state)
  );
  return { paginator, states, pages, requests: () => requests };
}

describe('back pagination', () => {
  it('starts with more history to load, not loading', () => {
    assert.deepEqual(createBackPaginator(async () => true, () => undefined).state(), INITIAL_BACK_PAGINATION);
  });

  it('loads one page at a time, ignoring requests while one loads', async () => {
    const { paginator, pages, states, requests } = paginatorOverPages();
    const first = paginator.load();
    void paginator.load();
    assert.equal(requests(), 1);
    assert.deepEqual(paginator.state(), { loading: true, hasMore: true, failed: false });

    pages[0].resolve(true);
    await first;

    assert.deepEqual(states.at(-1), { loading: false, hasMore: true, failed: false });
    void paginator.load();
    assert.equal(requests(), 2);
  });

  it('stops once the start of the history is reached', async () => {
    const { paginator, pages, requests } = paginatorOverPages();
    const load = paginator.load();
    pages[0].resolve(false);
    await load;

    assert.deepEqual(paginator.state(), { loading: false, hasMore: false, failed: false });
    await paginator.load();
    assert.equal(requests(), 1);
  });

  it('reports a failed page and tries it again on the next load', async () => {
    const { paginator, pages, requests } = paginatorOverPages();
    const load = paginator.load();
    pages[0].reject(new Error('offline'));
    await load;
    assert.deepEqual(paginator.state(), { loading: false, hasMore: true, failed: true });

    const again = paginator.load();
    assert.equal(requests(), 2);
    assert.deepEqual(paginator.state(), { loading: true, hasMore: true, failed: false });
    pages[1].resolve(true);
    await again;
    assert.deepEqual(paginator.state(), { loading: false, hasMore: true, failed: false });
  });
});
