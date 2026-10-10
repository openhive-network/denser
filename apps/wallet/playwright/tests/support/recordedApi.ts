import path from 'node:path';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from '../../../../blog/playwright/tests/support/mock-server/fixture-proxy';
import { FIXTURE_API_PORT } from './apiStub';

/**
 * Recorded API responses for the wallet's offline specs, for a page whose content comes from live
 * chain data rather than the hand-written stub (walletApiStub.ts). It is the blog's fixture proxy
 * (apps/blog/playwright/tests/support/mock-server/fixture-proxy.ts, same file format and request
 * matching) on FIXTURE_API_PORT, with the recordings under `tests/mock/fixtures/<name>/`.
 *
 * Replay (the default) serves only the recorded responses, and every request without a recording
 * is a miss, which the spec fails on (read them with `drainMissLabels` after each test): the wallet has no miss baseline like the blog's
 * known-misses.json, so a recorded spec must make no unrecorded request at all.
 *
 * Record, with network access to the API (it rewrites the whole dir):
 *
 *   FIXTURE_MODE=record pnpm --filter @hive/wallet exec playwright test \
 *     --config=playwright.fixture.config.ts <spec>
 *
 * on a build made with `NEXT_PUBLIC_BASE_PATH=/wallet`, as .aidev/run-wallet-fixture-e2e.sh does.
 * FIXTURE_UPSTREAM overrides the upstream host (default api.hive.blog).
 */

export const isRecordMode = process.env.FIXTURE_MODE === 'record';

export const WALLET_FIXTURES_ROOT = path.resolve(__dirname, '..', 'mock', 'fixtures');

/** Starts the recording proxy (record mode) or the replay proxy for the recordings named `name`. */
export const startRecordedApi = async (name: string): Promise<IFixtureProxyHandle> => {
  const options = { port: FIXTURE_API_PORT, fixturesRoot: WALLET_FIXTURES_ROOT };
  if (isRecordMode) {
    const target = process.env.FIXTURE_UPSTREAM;
    return createFixtureProxy(name, { ...options, ...(target ? { target } : {}) });
  }
  if (!hasFixtures(name, WALLET_FIXTURES_ROOT)) {
    throw new Error(`No recordings for "${name}" in ${WALLET_FIXTURES_ROOT}: record them with FIXTURE_MODE=record`);
  }
  return createReplayProxy(name, options);
};

/** The requests since the previous call that had no recording, as `<method or GET path>` labels. */
export const drainMissLabels = (proxy: IFixtureProxyHandle): string[] =>
  proxy.drainMisses().map(({ method, hash }) => `${method} (${hash})`);
