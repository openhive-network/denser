import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { HomePage } from '../support/pages/homePage';

test.describe('Comments of post', () => {
  let homePage: HomePage;
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
  });
  test('Validate a first comment of a first post page with number of comments is visible', async ({
    page
  }) => {
    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    await expect(postPage.commentCardsHeaders.first()).toBeVisible();
    await expect(postPage.commentCardsDescriptions.first()).toBeVisible();
    await expect(postPage.commentCardsFooters.first()).toBeVisible();
  });

  test('Validate a hovered comment changes backgroundcolor style', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    // Before hover
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentListItems.locator('div > div').first(),
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');

    // After hover
    await postPage.commentListItems.first().hover();
    await postPage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentListItems.locator('div > div').first(),
        'background-color'
      )
    ).toBe('rgb(241, 245, 249)');
  });
});
