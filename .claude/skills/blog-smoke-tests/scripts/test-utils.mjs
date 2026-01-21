/**
 * Shared utilities for smoke tests
 * Reduces boilerplate and provides consistent patterns
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Environment configuration with defaults
export const config = {
  get BASE_URL() {
    return process.env.BASE_URL || 'https://blog.openhive.network';
  },
  get API_URL() {
    return process.env.API_URL || 'https://api.hive.blog';
  },
  get HEADLESS() {
    return process.env.HEADLESS === 'true';
  },
  get REPORT_DIR() {
    return process.env.REPORT_DIR || './playwright/temp_ai_report_tests';
  },
  get TEST_USER() {
    return process.env.TEST_USER || 'gtg';
  }
};

// Common timeouts
export const TIMEOUTS = {
  NAVIGATION: 60000,
  ELEMENT_VISIBLE: 30000,
  NETWORK_IDLE: 30000,
  TOOLTIP: 2000,
  SHORT: 10000
};

// Common selectors
export const SELECTORS = {
  POST_LIST_ITEM: '[data-testid="post-list-item"]',
  POST_TITLE: '[data-testid="post-title"]',
  POST_AUTHOR: '[data-testid="post-author"]',
  POST_PAYOUT: '[data-testid="post-payout"]',
  POST_VOTES: '[data-testid="post-total-votes"]',
  POST_CHILDREN: '[data-testid="post-children"]',
  POST_CARD_CATEGORY: '[data-testid="post-card-category"]',
  PROFILE_STATS: '[data-testid="profile-stats"]',
  ARTICLE_TITLE: '[data-testid="article-title"]',
  LOGIN_BTN: '[data-testid="login-btn"]',
  TOOLTIP: '[role="tooltip"]',
  COMMENT_VOTES: '[data-testid="comment-votes"]',
  UPVOTE_BUTTON: '[data-testid="upvote-button"]'
};

/**
 * Creates a browser context with tracing enabled
 * @returns {Promise<{browser, context, page}>}
 */
export async function createBrowserContext() {
  await mkdir(config.REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: config.HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Start tracing for debugging
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true
  });

  return { browser, context, page };
}

/**
 * Saves failure artifacts (screenshot and trace)
 * @param {Page} page - Playwright page
 * @param {BrowserContext} context - Playwright context
 * @param {string} testId - Test identifier (e.g., 'SMOKE-01')
 * @returns {Promise<string[]>} - Array of artifact filenames
 */
export async function saveFailureArtifacts(page, context, testId) {
  const artifacts = [];
  const screenshotPath = join(config.REPORT_DIR, `${testId}-failure.png`);
  const tracePath = join(config.REPORT_DIR, `${testId}-trace.zip`);

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   Screenshot saved: ${screenshotPath}`);
    artifacts.push(`${testId}-failure.png`);
  } catch (e) {
    console.log(`   Could not save screenshot: ${e.message}`);
  }

  await context.tracing.stop({ path: tracePath });
  console.log(`   Trace saved: ${tracePath}`);
  artifacts.push(`${testId}-trace.zip`);

  return artifacts;
}

/**
 * Closes browser and stops tracing
 * @param {Browser} browser - Playwright browser
 * @param {BrowserContext} context - Playwright context
 * @param {boolean} passed - Whether test passed
 */
export async function closeBrowser(browser, context, passed) {
  if (passed) {
    await context.tracing.stop();
  }
  await browser.close();
}

/**
 * Outputs test result in JSON format for report generator
 * @param {Object} result - Test result object
 */
export function outputResult(result) {
  console.log('\n__RESULT__' + JSON.stringify(result));
}

/**
 * Creates standardized test result object
 * @param {string} testId - Test ID
 * @param {string} testName - Test name
 * @param {string} priority - Priority (P0-P4)
 * @param {boolean} passed - Whether test passed
 * @param {string|null} error - Error message if failed
 * @param {string[]} artifacts - Array of artifact filenames
 * @returns {Object}
 */
export function createResult(testId, testName, priority, passed, error = null, artifacts = []) {
  return {
    id: testId,
    name: testName,
    priority: priority,
    passed: passed,
    error: error,
    artifacts: artifacts
  };
}

/**
 * Prints test header
 * @param {string} testId - Test ID
 * @param {string} testName - Test name
 * @param {string} [suffix] - Optional suffix
 */
export function printHeader(testId, testName, suffix = '') {
  console.log('========================================');
  console.log(`${testId}: ${testName}${suffix ? ' ' + suffix : ''}`);
  console.log('========================================\n');
}

/**
 * Prints test footer with result
 * @param {string} testId - Test ID
 * @param {boolean} passed - Whether test passed
 */
export function printFooter(testId, passed) {
  console.log('\n========================================');
  console.log(passed ? `✓ ${testId}: PASS` : `✗ ${testId}: FAIL`);
  console.log('========================================');
}

/**
 * Waits for posts to load on page
 * @param {Page} page - Playwright page
 * @param {number} [timeout] - Timeout in ms
 */
export async function waitForPostsToLoad(page, timeout = TIMEOUTS.ELEMENT_VISIBLE) {
  await page.locator(SELECTORS.POST_LIST_ITEM).first().waitFor({
    state: 'visible',
    timeout: timeout
  });
}

/**
 * Navigates to a page and waits for posts
 * @param {Page} page - Playwright page
 * @param {string} path - URL path (e.g., '/trending')
 */
export async function gotoAndWaitForPosts(page, path) {
  await page.goto(`${config.BASE_URL}${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await waitForPostsToLoad(page);
}

/**
 * Waits for tooltip to appear after hover
 * @param {Page} page - Playwright page
 * @param {Locator} element - Element to hover
 * @param {number} [timeout] - Timeout in ms
 * @returns {Promise<Locator>} - Tooltip locator
 */
export async function hoverAndWaitForTooltip(page, element, timeout = TIMEOUTS.TOOLTIP) {
  await element.hover();
  const tooltip = page.locator(SELECTORS.TOOLTIP);

  // Use proper Playwright wait instead of waitForTimeout
  try {
    await tooltip.waitFor({ state: 'visible', timeout: timeout });
  } catch {
    // Tooltip may not appear, that's ok for some tests
  }

  return tooltip;
}

/**
 * Makes an API request to Hive blockchain
 * @param {string} method - API method name
 * @param {Object} params - Method parameters
 * @returns {Promise<Object>} - API response
 */
export async function hiveApiCall(method, params) {
  const request = {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: 1
  };

  const response = await fetch(config.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  return response.json();
}

/**
 * Gets ranked posts from API
 * @param {string} sort - Sort type (trending, hot, created)
 * @param {number} limit - Number of posts
 * @returns {Promise<Object>}
 */
export async function getRankedPosts(sort = 'trending', limit = 20) {
  return hiveApiCall('bridge.get_ranked_posts', {
    sort: sort,
    tag: '',
    observer: '',
    limit: limit
  });
}

/**
 * Gets user profile from API
 * @param {string} account - Username
 * @returns {Promise<Object>}
 */
export async function getUserProfile(account) {
  return hiveApiCall('bridge.get_profile', { account: account });
}

/**
 * Gets account info from API
 * @param {string} account - Username
 * @returns {Promise<Object>}
 */
export async function getAccountInfo(account) {
  return hiveApiCall('database_api.find_accounts', {
    accounts: [account],
    delayed_votes_active: false
  });
}

/**
 * Gets votes for a post
 * @param {string} author - Post author
 * @param {string} permlink - Post permlink
 * @param {number} limit - Max votes to fetch
 * @returns {Promise<Object>}
 */
export async function getPostVotes(author, permlink, limit = 1000) {
  return hiveApiCall('database_api.list_votes', {
    start: [author, permlink, ''],
    limit: limit,
    order: 'by_comment_voter'
  });
}

/**
 * Extracts author from post element
 * @param {Locator} postElement - Post card locator
 * @returns {Promise<string>}
 */
export async function extractAuthorFromPost(postElement) {
  const authorElement = postElement.locator(SELECTORS.POST_AUTHOR);
  const authorText = await authorElement.textContent();
  return authorText?.trim().replace('@', '') || '';
}

/**
 * Extracts permlink from post element
 * @param {Locator} postElement - Post card locator
 * @returns {Promise<string>}
 */
export async function extractPermlinkFromPost(postElement) {
  const titleElement = postElement.locator(`${SELECTORS.POST_TITLE} a`);
  const postLink = await titleElement.getAttribute('href');
  return postLink?.split('/').pop() || '';
}

/**
 * Parses number from text (removes non-numeric chars except dots)
 * @param {string} text - Text containing number
 * @returns {number}
 */
export function parseNumber(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Parses integer from text (removes non-numeric chars)
 * @param {string} text - Text containing number
 * @returns {number}
 */
export function parseInteger(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Runs a smoke test with standard boilerplate
 * @param {Object} testConfig - Test configuration
 * @param {string} testConfig.id - Test ID
 * @param {string} testConfig.name - Test name
 * @param {string} testConfig.priority - Priority
 * @param {string} [testConfig.headerSuffix] - Optional header suffix
 * @param {Function} testFn - Test function receiving {page, browser, context}
 * @returns {Promise<boolean>}
 */
export async function runSmokeTest(testConfig, testFn) {
  const { id, name, priority, headerSuffix } = testConfig;

  printHeader(id, name, headerSuffix);

  const { browser, context, page } = await createBrowserContext();

  let passed = true;
  let errorMessage = null;
  let artifacts = [];

  try {
    passed = await testFn({ page, browser, context });
  } catch (error) {
    console.error('✗ ERROR:', error.message);
    errorMessage = error.message;
    passed = false;
  }

  if (!passed) {
    artifacts = await saveFailureArtifacts(page, context, id);
  }

  await closeBrowser(browser, context, passed);

  printFooter(id, passed);
  outputResult(createResult(id, name, priority, passed, errorMessage, artifacts));

  return passed;
}
