import { expect, Page } from '@playwright/test';
import { testTimeout } from '../../../../../playwright/support/timeouts';
import { HomePage } from './pages/homePage';
import { CommentEditorPage } from '../support/pages/commentEditorPage';

export function generateRandomString(length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}


/**
 * Polls `isReady` every `interval` ms, reloading the page before each retry, until it
 * returns true or `timeout` elapses. Resolves either way: on timeout it only warns,
 * leaving the verdict to the caller's own assertions.
 */
async function pollWithReload(
  page: Page,
  isReady: () => Promise<boolean>,
  timeout: number,
  interval: number,
  timeoutWarning: string
) {
  let isFirstAttempt = true;

  try {
    await expect
      .poll(
        async () => {
          if (!isFirstAttempt) await page.reload();
          isFirstAttempt = false;
          return isReady();
        },
        { timeout, intervals: [interval] }
      )
      .toBe(true);
  } catch (error) {
    console.warn(`${timeoutWarning}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * It waits for the visibility of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} selector - CSS selector of the element to be checked.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForElementVisible(page: Page, selector: string, timeout = testTimeout('poll-with-reload', 5000), interval = 250) {
  await pollWithReload(
    page,
    () => page.locator(selector).isVisible(),
    timeout,
    interval,
    `The element '${selector}' did not become visible within ${timeout}ms.`
  );
}

/**
 * It waits for the specific color of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} selector - CSS selector of the element to be checked.
 * @param {string} colorRGB - CSS color attribute as rgb.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForElementColor(page: Page, selector: string, colorRGB: string, timeout = testTimeout('poll-with-reload', 5000), interval = 250) {
  const homePage = new HomePage(page);

  await pollWithReload(
    page,
    async () => (await homePage.getElementCssPropertyValue(page.locator(selector), 'color')) === colorRGB,
    timeout,
    interval,
    `The element '${selector}' did not become visible with specific color within ${timeout}ms.`
  );
}

/**
 * It waits for the specific color of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} selector - CSS selector of the element to be checked.
 * @param {string} colorRGB - CSS color attribute as rgb.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForDownvoteColor(page: Page, selector: string, colorRGB: string, timeout = testTimeout('poll-with-reload', 5000), interval = 250) {
  const homePage = new HomePage(page);

  await pollWithReload(
    page,
    async () => {
      // Hovering the upvote button due to validate the real uncovered downvote button after voting
      await homePage.firstPostCardUpvoteButtonLocator.hover();
      return (await homePage.getElementCssPropertyValue(page.locator(selector), 'color')) === colorRGB;
    },
    timeout,
    interval,
    `The element '${selector}' did not become visible with specific color within ${timeout}ms.`
  );
}


/**
 * It waits for the visibility of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} randomString - Random string generated in the post content.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForCommentIsVisible(page: Page, randomString: string, timeout = testTimeout('poll-with-reload', 5000), interval = 250) {
  const commentEditorPage = new CommentEditorPage(page);

  await pollWithReload(
    page,
    async () => (await commentEditorPage.findCreatedCommentContentByText(randomString)).isVisible(),
    timeout,
    interval,
    `The element of a comment '${randomString}' did not become visible within ${timeout}ms.`
  );
}
