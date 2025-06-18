import { expect, Locator} from '@playwright/test';
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
 * It waits for the visibility of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} selector - CSS selector of the element to be checked.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForElementVisible(page, selector, timeout = 5000, interval = 250) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elementHandle: Locator = await page.locator(selector);
    if (elementHandle) {
      const isVisible = await elementHandle.isVisible();
      if (isVisible) {
        await expect(elementHandle).toBeVisible();
        return;
      }
    }
    await page.reload(); // reload page
    await page.waitForTimeout(interval);
  }

  console.warn(`The element '${selector}' did not become visible within ${timeout}ms.`);
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
export async function waitForElementColor(page, selector, colorRGB, timeout = 5000, interval = 250) {
  const homePage = new HomePage(page);
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elementHandle: Locator = await page.locator(selector);
    if (elementHandle) {
      const elementColor = await homePage.getElementCssPropertyValue(elementHandle, 'color')
      if (elementColor === colorRGB) {
        return;
      }
    }
    await page.reload(); // reload page
    await page.waitForTimeout(interval);
  }

  console.warn(`The element '${selector}' did not become visible with specific color within ${timeout}ms.`);
}

/**
 * It waits for the visibility of an element at a certain time and interval.
 *
 * @param {import('@playwright/test').Page} page - Page object of Playwright.
 * @param {string} randomString - Random string generated in the post content.
 * @param {number} timeout - Maximum waiting time in milliseconds.
 * @param {number} interval - Checking interval in milliseconds.
 */
export async function waitForCommentIsVisible(page, randomString, timeout = 5000, interval = 250) {
  const startTime = Date.now();
  const commentEditorPage = new CommentEditorPage(page);

  while (Date.now() - startTime < timeout) {
    const elementHandle: Locator = await commentEditorPage.findCreatedCommentContentByText(randomString);
    if (elementHandle) {
      const isVisible = await elementHandle.isVisible();
      if (isVisible) {
        await expect(elementHandle).toBeVisible();
        return;
      }
    }
    await page.reload(); // reload page
    await page.waitForTimeout(interval);
  }

  console.warn(`The element of a comment '${randomString}' did not become visible within ${timeout}ms.`);
}
