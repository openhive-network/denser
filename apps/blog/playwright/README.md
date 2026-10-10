# Playwright tests

The blog and the wallet each have two Playwright suites:

| Suite | Specs | Config | Data |
|-------|-------|--------|------|
| fixture | `playwright/tests/fixture` | `playwright.fixture.config.ts` | recorded API responses, no network |
| live e2e | `playwright/tests/e2e` | `playwright.config.ts` | the live Hive API (mainnet) |

Writing fixture specs for the blog: see [tests/fixture/CLAUDE.md](tests/fixture/CLAUDE.md).

## What GitLab CI runs

| Job | Suite | Gates the pipeline |
|-----|-------|--------------------|
| `blog-fixture-tests`, `wallet-fixture-tests` | fixture, `pnpm test:fixture` | yes |
| `e2e-tests-blog-stable`, `e2e-tests-wallet-stable` | live e2e, `--grep-invert @flaky` | yes |
| `e2e-tests-blog-flaky`, `e2e-tests-wallet-flaky` | live e2e, `--grep @flaky` | no (`allow_failure`) |

Each job publishes its junit as a GitLab test report.

### Live e2e runs on chromium only

`DESKTOP_BROWSER_PROJECTS` (`playwright/shared-config.ts`) defines `chromium`, `firefox` and
`webkit` projects, but every live e2e job's matrix is `PROJECT: ['chromium']`, so CI never runs
firefox or webkit. The screenshot baselines (`*-snapshots/*-chromium-linux.png`) exist only for
chromium, and many specs skip the other two browsers. They remain usable locally
(`pnpm pw:test:local:firefox`, `pnpm pw:test:local:webkit`), with no guarantee that they pass.
The fixture suites define only a `chromium-fixture` project.

## Quarantining a live test (`@flaky`)

A live e2e test that fails because of mainnet data or service health, not because of the
code, moves out of the stable job: put `@flaky` in its title, and above it a comment saying
why, linking the issue that tracks the fix or its fixture-suite replacement:

```ts
// Quarantined (#962): depends on whether @gtg currently has pending comment payouts on mainnet.
test('@flaky Tab Payouts - ReComment Card - Title', async ({ page }) => {
```

A failure caused by the test itself (a race, a stale selector, a wrong expectation) is
fixed instead of quarantined.

The weekly flake report (`scripts/ci/flake-report.mjs`) lists the tests that failed or passed
only on retry in these jobs.
