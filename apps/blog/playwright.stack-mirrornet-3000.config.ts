import { defineConfig } from '@playwright/test';
import { DESKTOP_BROWSER_PROJECTS, baseConfig, browserUse } from '../../playwright/shared-config';
require('dotenv').config({ path: '../../stack/mirrornet-stack.env' });
require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './test.env' });

/* The same default value as in site.ts */
process.env.REACT_APP_API_ENDPOINT =
  process.env.REACT_APP_API_ENDPOINT ||
  `https://${process.env.PUBLIC_HOSTNAME}:${process.env.API_HTTPS_PORT}/`;
if (process.env.REACT_APP_API_ENDPOINT.substr(-1) != '/') process.env.REACT_APP_API_ENDPOINT += '/';

/**
 * The testnet suite (playwright/tests/testnet_e2e) against a mirrornet stack.
 * See https://playwright.dev/docs/test-configuration.
 */
const mirrornet = defineConfig({
  ...baseConfig(),
  testDir: './playwright/tests/testnet_e2e',
  timeout: 180 * 1000,
  fullyParallel: true,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests. */
  workers: 1,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: `playwright-report/` }],
        ['junit', { outputFile: `junit/results.xml` }],
        ['list', { printSteps: false }]
      ]
    : 'html',
  use: {
    ...browserUse(!process.env.CI),
    baseURL: process.env.DENSER_URL || `https://${process.env.PUBLIC_HOSTNAME}:${process.env.BLOG_PORT}/`,
    /* Disable CORS */
    bypassCSP: true,
    launchOptions: {
      args: ['--disable-web-security', '--ignore-certificate-errors']
    }
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/
    },
    ...DESKTOP_BROWSER_PROJECTS
  ]
});

export default mirrornet;

/**
 * This config against the mirrornet stack on `host` (e.g. 14.bc.fqdn.pl), with
 * a 60 s test timeout and a trace without DOM snapshots. `withAuthSetup: false`
 * drops the auth setup project.
 */
export function fqdnStackConfig(host: string, withAuthSetup: boolean) {
  process.env.REACT_APP_API_ENDPOINT = `https://${host}:8083/`;
  return defineConfig({
    ...mirrornet,
    timeout: 60 * 1000,
    use: {
      ...mirrornet.use,
      baseURL: `https://${host}:3000/`,
      trace: 'retain-on-failure'
    },
    projects: withAuthSetup
      ? mirrornet.projects
      : mirrornet.projects?.filter((project) => project.name !== 'setup')
  });
}
