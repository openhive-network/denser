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
    await expect(postPage.commentCardsTitles.first()).toBeVisible();
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
        postPage.commentListItems.locator('div').first(),
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');

    // After hover
    await postPage.commentListItems.first().hover();
    await postPage.page.waitForTimeout(1000);
    expect(
      await postPage.getElementCssPropertyValue(
        postPage.commentListItems.locator('div').first(),
        'background-color'
      )
    ).toBe('rgb(241, 245, 249)');
  });

  test('move to the first comment author of a first post with more than zero comments', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);
    const profilePage = new ProfilePage(page);

    await homePage.goto();
    await homePage.moveToTheFirstPostWithCommentsNumberMoreThanZero();
    await expect(postPage.commentCardsHeaders.first()).toBeVisible();

    const firstCommentAuthorLinkName: any = await postPage.commentAuthorLink.first().textContent();
    await postPage.commentAuthorLink.first().click();
    await profilePage.profileNickNameIsEqual(firstCommentAuthorLinkName);
  });
});
