/**
 * SMOKE-16: Search
 * Priority: P1 (Important)
 *
 * Verifies the search page works, and separates a broken search UI (FAIL) from
 * a degraded AI-search backend (PASS with a warning), see #965.
 *
 * Hard requirements (FAIL when broken):
 *   - /search shows the search input
 *   - submitting a query navigates to a search results URL
 *   - Classic Search (/search?q=...; bridge-based, independent of HiveSense)
 *     renders results. "hive" always has results, so its "Nothing was found."
 *     state is a failure too
 *   - whenever a direct probe of HiveSense returns renderable posts, the AI
 *     page must show them. The AI error/"unavailable" fallback, a blank page,
 *     or a search input that never enters AI mode is then our own code failing
 *   - AI search saying "Nothing was found." while the probe returns results
 *
 * Degraded, reported as a warning (the test passes) only when the probe shows
 * HiveSense down, empty, or serving posts the blog cannot render (no post_id):
 *   - the AI-search health check is off, so the input falls back to Classic
 *     Search (the #947 fallback)
 *   - AI results show the "AI search is unavailable" fallback (#947), or
 *     "Nothing was found." while the backend returns nothing
 *   - AI results stay on the loading spinner / blank
 *     (#947 / #949: develop drops posts without post_id, shows no fallback)
 *
 * The AI part depends on an external service that the blog cannot fix and
 * that has been degraded for months; failing on it made the whole smoke job
 * red on almost every run and hid real regressions.
 */
import {
  runSmokeTest,
  config,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-16';
const TEST_NAME = 'Search';
const TEST_PRIORITY = 'P1';

const QUERY = 'hive';
const AI_RESULTS_TIMEOUT_MS = 30000;
const BACKEND_PROBE_TIMEOUT_MS = 20000;
const SEARCH_INPUT = 'input[type="search"], input[placeholder*="earch"], input[data-testid="search-input"]';
// en "search_page.no_results" is "Nothing was found."
const NO_RESULTS_TEXT = /nothing was found/i;
// Fallback UI from the #947 fix (fix/947-949-ai-search-fallback) plus the
// plain error text develop renders when the search request rejects.
const AI_FALLBACK = '[data-testid="ai-search-error"], [data-testid="ai-search-empty"]';
const AI_UNAVAILABLE_TEXT = /ai search is unavailable|error loading search results/i;

/**
 * Reads the HiveSense base URL the deployed blog uses from its runtime env.
 * @param {Page} page - Playwright page
 * @returns {Promise<string|null>}
 */
async function readAiDomain(page) {
  // SMOKE_AI_DOMAIN probes a different HiveSense than the deployed blog uses
  // (e.g. to check the test's verdicts against a stub backend).
  if (process.env.SMOKE_AI_DOMAIN) return process.env.SMOKE_AI_DOMAIN.replace(/\/$/, '');
  try {
    const response = await page.request.get(`${config.BASE_URL}/__ENV.js`, { timeout: TIMEOUTS.SHORT });
    const match = (await response.text()).match(/"REACT_APP_AI_DOMAIN"\s*:\s*"([^"]+)"/);
    return match ? match[1].replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

/**
 * Calls HiveSense posts/search directly, like ai-result.tsx does.
 * @param {string|null} aiDomain - HiveSense base URL
 * @returns {Promise<{healthy: boolean, renderable: boolean, summary: string}>}
 */
async function probeHiveSense(aiDomain) {
  if (!aiDomain) {
    return { healthy: false, renderable: false, summary: 'AI domain unknown (no REACT_APP_AI_DOMAIN in /__ENV.js)' };
  }
  const url = `${aiDomain}/hivesense-api/posts/search?q=${QUERY}&truncate=1&result_limit=20&full_posts=10`;
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(BACKEND_PROBE_TIMEOUT_MS) });
    const ms = Date.now() - started;
    if (!response.ok) {
      return { healthy: false, renderable: false, summary: `${aiDomain} posts/search -> HTTP ${response.status} in ${ms}ms` };
    }
    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      return { healthy: false, renderable: false, summary: `${aiDomain} posts/search returned no results in ${ms}ms` };
    }
    // Full posts carry a body; stubs are just {author, permlink}.
    const fullPosts = posts.filter((p) => p && typeof p.body === 'string');
    const withPostId = fullPosts.filter((p) => p.post_id);
    const summary =
      `${aiDomain} posts/search -> ${posts.length} results in ${ms}ms, ` +
      `${fullPosts.length} full posts, ${withPostId.length} with post_id`;
    return { healthy: true, renderable: withPostId.length > 0, summary };
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return {
      healthy: false,
      renderable: false,
      summary: `${aiDomain} posts/search failed after ${Date.now() - started}ms (${reason})`
    };
  }
}

/**
 * Waits for the AI results area to settle.
 * @param {Page} page - Playwright page
 * @returns {Promise<'results'|'empty'|'fallback'|'timeout'>}
 */
async function waitForAiOutcome(page) {
  const outcomes = [
    page.locator(SELECTORS.POST_LIST_ITEM).first().waitFor({ state: 'visible', timeout: AI_RESULTS_TIMEOUT_MS }).then(() => 'results'),
    page.getByText(NO_RESULTS_TEXT).first().waitFor({ state: 'visible', timeout: AI_RESULTS_TIMEOUT_MS }).then(() => 'empty'),
    page.locator(AI_FALLBACK).first().waitFor({ state: 'visible', timeout: AI_RESULTS_TIMEOUT_MS }).then(() => 'fallback'),
    page.getByText(AI_UNAVAILABLE_TEXT).first().waitFor({ state: 'visible', timeout: AI_RESULTS_TIMEOUT_MS }).then(() => 'fallback')
  ];
  return Promise.any(outcomes).catch(() => 'timeout');
}

/**
 * Checks the AI results for the query the input submitted.
 * @returns {Promise<boolean>} passed
 */
async function checkAiResults(page, warn) {
  console.log(`\n3. Waiting up to ${AI_RESULTS_TIMEOUT_MS / 1000}s for AI search results...`);
  const outcome = await waitForAiOutcome(page);

  if (outcome === 'results') {
    const count = await page.locator(SELECTORS.POST_LIST_ITEM).count();
    console.log(`   ✓ PASS: AI search rendered ${count} results`);
    return true;
  }

  const aiDomain = await readAiDomain(page);
  const probe = await probeHiveSense(aiDomain);
  console.log(`   (i) INFO: HiveSense probe: ${probe.summary}`);

  if (outcome === 'empty') {
    // "hive" always matches something; empty is only plausible when the
    // backend itself returns nothing.
    if (probe.healthy) {
      console.log(`   ✗ FAIL: AI search says "Nothing was found." but HiveSense returns results. Backend: ${probe.summary}`);
      return false;
    }
    warn(`AI search degraded: page says "Nothing was found." and HiveSense returns nothing (#947). Backend: ${probe.summary}`);
    return true;
  }

  if (outcome === 'fallback') {
    if (probe.renderable) {
      console.log(
        '   ✗ FAIL: AI search shows its error/"unavailable" fallback but HiveSense serves renderable results ' +
          `(the blog's own request code failed). Backend: ${probe.summary}`
      );
      return false;
    }
    warn(`AI search degraded: page shows the "AI search unavailable" fallback (#947). Backend: ${probe.summary}`);
    return true;
  }

  // Timed out: still on the spinner / skeleton, or blank.
  if (!probe.healthy) {
    warn(
      `AI search degraded: no AI results or fallback after ${AI_RESULTS_TIMEOUT_MS / 1000}s ` +
        `and the HiveSense backend is unavailable (#947). Backend: ${probe.summary}`
    );
    return true;
  }
  if (!probe.renderable) {
    warn(
      `AI search degraded: HiveSense answers but its full posts lack post_id, which the blog drops, ` +
        `so the page stays blank with no fallback (#949). Backend: ${probe.summary}`
    );
    return true;
  }
  console.log(
    `   ✗ FAIL: HiveSense serves renderable results but the page showed none after ${AI_RESULTS_TIMEOUT_MS / 1000}s ` +
      `(search UI broken). Backend: ${probe.summary}`
  );
  return false;
}

/**
 * Checks that Classic Search (bridge-based, no HiveSense) renders.
 * @returns {Promise<boolean>} passed
 */
async function checkClassicSearch(page) {
  console.log(`\n4. Classic Search: /search?q=${QUERY}&s=relevance ...`);
  await page.goto(`${config.BASE_URL}/search?q=${QUERY}&s=relevance`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  const outcome = await Promise.any([
    page.locator(SELECTORS.POST_LIST_ITEM).first().waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).then(() => 'results'),
    page.getByText(NO_RESULTS_TEXT).first().waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).then(() => 'empty')
  ]).catch(() => 'timeout');

  if (outcome === 'results') {
    const count = await page.locator(SELECTORS.POST_LIST_ITEM).count();
    console.log(`   ✓ PASS: Classic Search rendered ${count} results`);
    return true;
  }
  if (outcome === 'empty') {
    console.log(`   ✗ FAIL: Classic Search says "Nothing was found." for "${QUERY}", which always has results`);
    return false;
  }
  console.log(`   ✗ FAIL: Classic Search showed no results and no empty state within ${TIMEOUTS.ELEMENT_VISIBLE / 1000}s`);
  return false;
}

async function test({ page, warn }) {
  let allPassed = true;

  console.log('1. Opening /search page...');
  await page.goto(`${config.BASE_URL}/search`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  const searchInput = page.locator(SEARCH_INPUT).first();
  await searchInput.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
  if (!(await searchInput.isVisible().catch(() => false))) {
    console.log('   ✗ FAIL: Search input not visible');
    return false;
  }
  console.log('   ✓ PASS: Search input visible');

  console.log(`\n2. Submitting "${QUERY}" from the search input...`);
  await searchInput.fill(QUERY);
  await page.keyboard.press('Enter');
  const navigated = await page
    .waitForURL((url) => /[?&](ai|q)=/.test(url.search), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
    .then(() => true)
    .catch(() => false);
  if (!navigated) {
    console.log(`   ✗ FAIL: Submitting the query did not navigate to a results URL (still ${page.url()})`);
    return false;
  }
  const submittedUrl = new URL(page.url());
  console.log(`   ✓ PASS: Navigated to ${submittedUrl.pathname}${submittedUrl.search}`);

  if (submittedUrl.searchParams.has('ai')) {
    allPassed = (await checkAiResults(page, warn)) && allPassed;
  } else {
    // ModeSwitchInput starts in AI mode only when getHiveSenseStatus() is true;
    // otherwise the input submits a Classic Search (the #947 fallback). That
    // is only acceptable when HiveSense really cannot serve renderable results.
    const probe = await probeHiveSense(await readAiDomain(page));
    console.log(`   (i) INFO: HiveSense probe: ${probe.summary}`);
    if (probe.renderable) {
      console.log(
        '   ✗ FAIL: The search input submitted a Classic Search (AI mode off) although HiveSense serves ' +
          `renderable results. Backend: ${probe.summary}`
      );
      allPassed = false;
    } else {
      warn(
        'AI search mode unavailable (HiveSense health check failed); the search input fell back to Classic Search ' +
          `(#947). Backend: ${probe.summary}`
      );
    }
  }

  allPassed = (await checkClassicSearch(page)) && allPassed;

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));
