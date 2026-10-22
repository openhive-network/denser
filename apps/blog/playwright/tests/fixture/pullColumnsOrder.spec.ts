import { test, expect } from '../support/fixture-proxy-test';
import type { Locator, Page } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

/**
 * A `.pull-columns` pair places pull-left on the left and pull-right on the right whatever the
 * source order, as hive.blog's floats do. On a narrow screen the columns stack with pull-left first.
 *
 * The recording (shared with ssrHydration) is @guest4test1/test-ako-post, whose body has a
 * pull-left + pull-right pair. The pull-right-first case moves the rendered pull-right column in
 * front of its pull-left sibling, which is the DOM the renderer emits for a right-first pair.
 *
 *   PULL-COLS-01 – pull-left first in source: pull-right column is to the right
 *   PULL-COLS-02 – pull-right first in source: pull-right column is still to the right
 *   PULL-COLS-03 – pull-right first in source, narrow screen: pull-left column stacks on top
 */

test.use({ fixtureTestName: 'ssrHydration' });

const POST_PATH = '/test/@guest4test1/test-ako-post';
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const NARROW_VIEWPORT = { width: 375, height: 800 };

async function openPullColumns(page: Page): Promise<{ left: Locator; right: Locator }> {
  const postPage = new PostPage(page);
  await page.goto(POST_PATH);
  const pullColumns = postPage.articleBody.locator('.pull-columns').first();
  await expect(pullColumns).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  return {
    left: pullColumns.locator(':scope > .pull-left'),
    right: pullColumns.locator(':scope > .pull-right')
  };
}

async function putPullRightFirstInSource(right: Locator): Promise<void> {
  await right.evaluate((column) => column.parentElement?.prepend(column));
  await expect(right).toHaveJSProperty('previousElementSibling', null);
}

async function boxesOf(left: Locator, right: Locator) {
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  if (!leftBox || !rightBox) throw new Error('pull columns should have bounding boxes');
  return { leftBox, rightBox };
}

test.describe('Pull columns — desktop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('PULL-COLS-01 — pull-left first in source keeps pull-right on the right', async ({ page }) => {
    const { left, right } = await openPullColumns(page);
    const { leftBox, rightBox } = await boxesOf(left, right);
    expect(rightBox.x).toBeGreaterThanOrEqual(leftBox.x + leftBox.width);
  });

  test('PULL-COLS-02 — pull-right first in source still shows pull-right on the right', async ({ page }) => {
    const { left, right } = await openPullColumns(page);
    await putPullRightFirstInSource(right);
    const { leftBox, rightBox } = await boxesOf(left, right);
    expect(rightBox.x).toBeGreaterThanOrEqual(leftBox.x + leftBox.width);
    expect(Math.abs(rightBox.y - leftBox.y)).toBeLessThan(1);
  });
});

test.describe('Pull columns — narrow screen', () => {
  test.use({ viewport: NARROW_VIEWPORT });

  test('PULL-COLS-03 — pull-right first in source stacks pull-left on top', async ({ page }) => {
    const { left, right } = await openPullColumns(page);
    await putPullRightFirstInSource(right);
    const { leftBox, rightBox } = await boxesOf(left, right);
    expect(rightBox.y).toBeGreaterThanOrEqual(leftBox.y + leftBox.height);
  });
});
