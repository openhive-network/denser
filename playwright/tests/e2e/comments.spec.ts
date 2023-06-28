import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';

test.describe('Comments of post', () => {
  test('Validate a first comment of a first post page with number of comments is visible', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);

    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    await expect(postPage.commentCardsHeaders.first()).toBeVisible();
    await expect(postPage.commentCardsDescriptions.first()).toBeVisible();
    await expect(postPage.commentCardsFooters.first()).toBeVisible();
  });

  test('Validate a hovered comment changes backgroundcolor style', async ({ page }) => {
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);

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
