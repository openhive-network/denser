import { defineConfig, devices } from '@playwright/test';
import { baseConfig, ownWebServerOptions, standaloneServerCommand } from '../../playwright/shared-config';
import { FIXTURE_API_PORT } from './playwright/tests/support/apiStub';
import { FIXTURE_BLOG_URL, WALLET_BASE_PATH } from './playwright/tests/support/basePath';
import { FIXTURE_COOKIE_PASSWORD } from '../blog/playwright/tests/support/fixture-auth/constants';
import { localeStorageState, selectTests } from '../../playwright/support/i18n-layout';

/**
 * Playwright config for the wallet's offline specs (playwright/tests/fixture): a production build
 * served from `.next/standalone`, with no network and no recorded API responses. Every API
 * endpoint points at FIXTURE_API_PORT, closed unless a spec starts a stub there
 * (tests/support/apiStub.ts); while it is closed the server's prefetches fail at once and
 * pages render without account data; the specs check what does not depend on it (the JS chunks a
 * page loads, the requests it makes). The build must be made with
 * `NEXT_PUBLIC_BASE_PATH=WALLET_BASE_PATH`.
 *
 * Usage: pnpm --filter @hive/wallet test:fixture
 */

const PORT = 4000;
const FIXTURE_API = `http://127.0.0.1:${FIXTURE_API_PORT}`;
/**
 * The i18n checks (#1696), run only with DENSER_I18N_CHECKS=1, as the advisory pass of
 * .aidev/run-wallet-fixture-e2e.sh runs them: `i18n-layout` renders key routes in the pseudo-locale and
 * in Polish (playwright/support/i18n-layout.ts), `pl-locale` runs PL_RUN_TESTS with `NEXT_LOCALE=pl`.
 */
const I18N_CHECKS = process.env.DENSER_I18N_CHECKS === '1';
const I18N_LAYOUT_SPECS = /i18nLayout\w*\.spec\.ts$/;
/**
 * Existing tests run again in Polish by `pl-locale`, by spec file and test ID: the ones that find their
 * elements by test id or role, not by English text.
 */
const PL_RUN_TESTS = {
  'incomingDelegations.spec.ts': ['WALLET-INCOMING-02'],
  'proposalsSearch.spec.ts': ['WALLET-PROPOSALS-SEARCH-02'],
  'delegateRcDialog.spec.ts': ['WALLET-RC-06'],
  'proposalVoteBroadcast.spec.ts': [
    'WALLET-TX-PROPOSAL-VOTE-01',
    'WALLET-TX-PROPOSAL-VOTE-04',
    'WALLET-TX-PROPOSAL-UNVOTE-01',
    'WALLET-TX-PROPOSAL-UNVOTE-04'
  ]
};

export default defineConfig({
  ...baseConfig(),
  testDir: './playwright/tests/fixture',
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Under CI also write junit (GitLab test report) and JSON (flake report), as the blog's does.
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'junit/fixture/results.xml' }],
        ['json', { outputFile: 'junit/fixture/results.json' }]
      ]
    : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`
  },
  projects: [
    {
      name: 'chromium-fixture',
      testIgnore: I18N_LAYOUT_SPECS,
      use: { ...devices['Desktop Chrome'] }
    },
    ...(I18N_CHECKS
      ? [
          { name: 'i18n-layout', testMatch: I18N_LAYOUT_SPECS, use: { ...devices['Desktop Chrome'] } },
          {
            name: 'pl-locale',
            ...selectTests(PL_RUN_TESTS),
            use: { ...devices['Desktop Chrome'], storageState: localeStorageState('pl') }
          }
        ]
      : [])
  ],
  webServer: {
    // The standalone build, with react-env writing __ENV.js from this environment.
    command: standaloneServerCommand('wallet'),
    url: `http://127.0.0.1:${PORT}${WALLET_BASE_PATH}/api/health`,
    ...ownWebServerOptions(),
    env: {
      REACT_APP_API_ENDPOINT: FIXTURE_API,
      REACT_APP_ALLOWED_HIVE_API_NODES: FIXTURE_API,
      // As the deployments: hb-auth loads its worker from under the base path.
      REACT_APP_BASE_PATH: WALLET_BASE_PATH,
      // As the single-host deployments: the blog is served under a base path on the same host.
      REACT_APP_BLOG_DOMAIN: FIXTURE_BLOG_URL,
      // The session routes a sign-in calls need iron-session's password; no spec reads the cookie
      DENSER_SERVER_SECRET_COOKIE_PASSWORD: FIXTURE_COOKIE_PASSWORD,
      // The API set engine's probes are no recorded calls: it learns from real calls only.
      DENSER_API_SETS_PROBING: 'off',
      // The pseudo-locale (packages/ui/lib/pseudo-locale.ts) the `i18n-layout` project renders pages in.
      REACT_APP_PSEUDO_LOCALE: 'true',
      HOSTNAME: '0.0.0.0',
      PORT: String(PORT)
    }
  }
});
