import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import {
  expectSingleNamedResponsesLink,
  expectSingleTabStop,
  readResponsesCount
} from '../support/responsesCounter';

/**
 * RESP-A11Y-01 – the post card's responses counter is one link to the post's #comments, named
 * with the count, a single Tab stop, and its tooltip opens on keyboard focus.
 *
 * Reuses the `homepage` recording.
 */

test.use({ fixtureTestName: 'homepage' });

test('RESP-A11Y-01: post card responses counter is a single named link to #comments', async ({ page }) => {
  const homePage = new HomePage(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const link = homePage.getFirstPostResponseButton;
  await expect(link).toBeVisible({ timeout: 30000 });

  await expectSingleNamedResponsesLink(link, await readResponsesCount(link));
  await expect(link).toHaveAttribute('href', /\/@[^/]+\/[^/]+\/?#comments$/);

  await link.focus();
  await expect(homePage.getFirstPostResponseButtonTooltip).toBeVisible();
  await expectSingleTabStop(page, link);
});
