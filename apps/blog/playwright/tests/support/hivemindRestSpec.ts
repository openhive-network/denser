import type { Page } from '@playwright/test';
import { test } from './fixture-proxy-test';
import { HIVEMIND_REST_STUB_URL, startHivemindRestStub, type IHivemindRestStub } from './hivemindRestStub';

export interface IHivemindRestSpec {
  /** The blog server reading from the stub (HIVEMIND_REST_NODES set). */
  readonly restBaseURL: string;
  /** Every request the stub got since the test started. */
  readonly requests: IHivemindRestStub['requests'];
  /** Path and query of each request the stub answered with a result. */
  servedRestRequests(): string[];
  /**
   * Makes `page`'s browser read from the stub on the REST blog server too. The suite's servers
   * share one build, whose `__ENV.js` (the browser's settings) is the main server's, so the
   * browser would otherwise see HIVEMIND_REST_NODES empty on every server.
   */
  readFromRestInBrowser(page: Page): Promise<void>;
}

/**
 * Runs the hivemind REST stub for the spec file's tests, answering from the spec's fixture set,
 * and skips them when no blog server reads from it. Call at the top of a serial spec file.
 */
export function useHivemindRestStub(): IHivemindRestSpec {
  let stub: IHivemindRestStub | undefined;
  let restBaseURL = '';

  test.beforeAll(async ({ hivemindRestBaseURL, fixtureProxy: _fixtureProxy, fixturePort }) => {
    if (!hivemindRestBaseURL) return;
    restBaseURL = hivemindRestBaseURL;
    stub = await startHivemindRestStub(`http://localhost:${fixturePort}`);
  });

  test.afterAll(async () => {
    await stub?.close();
  });

  test.beforeEach(({ hivemindRestBaseURL }) => {
    test.skip(!hivemindRestBaseURL, 'no blog serves with HIVEMIND_REST_NODES set');
    if (stub) stub.requests.length = 0;
  });

  return {
    get restBaseURL() {
      return restBaseURL;
    },
    get requests() {
      return stub?.requests ?? [];
    },
    servedRestRequests: () =>
      stub?.requests.filter(({ status }) => status === 200).map(({ url }) => url) ?? [],
    readFromRestInBrowser: async (page) => {
      await page.route(
        (url) => url.origin === new URL(restBaseURL).origin && url.pathname.endsWith('/__ENV.js'),
        async (route) => {
          const response = await route.fetch();
          const setting = `window.__ENV.REACT_APP_HIVEMIND_REST_NODES = ${JSON.stringify(HIVEMIND_REST_STUB_URL)};`;
          await route.fulfill({ response, body: `${await response.text()}\n${setting}\n` });
        }
      );
    }
  };
}
