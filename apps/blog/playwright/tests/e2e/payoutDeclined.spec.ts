import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';

test.describe('Profile page of @hiveio', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('validate declined payout in the post cards of the @hiveio', async ({ page }) => {
    let textDecorationLineCssValue: string = '';

    // Go and validate URL of page is "http://.../@hiveio"
    await profilePage.gotoProfilePage('@hiveio');
    await expect(profilePage.page).toHaveURL(/ *.\/@hiveio$/);
    // Find the post card with the declined payout
    let amountPayoutsDeclined: [] = await page.locator('[data-testid="post-payout-decline"]').all();

    // If there are no declined payouts in the post card then load next page of the posts (scroll down)
    let i = 0;
    while (amountPayoutsDeclined.length <= 0){
      // Load more posts
      await homePage.mainPostsTimelineVisible(20 + i);
      await homePage.page.keyboard.down('End');
      amountPayoutsDeclined = await page.locator('[data-testid="post-payout-decline"]').all();
      i = i + 20; // next 20 posts
    }

    if (amountPayoutsDeclined.length > 0) {
      // First declined payout element on the array
      await expect(amountPayoutsDeclined[0]).toHaveAttribute('title', 'Payout Declined');
      textDecorationLineCssValue = await homePage.getElementCssPropertyValue(amountPayoutsDeclined[0], "text-decoration-line");
      await expect(textDecorationLineCssValue).toBe('line-through');
    }
  });

  test('validate declined payout inside the post of the @hiveio', async ({ page }) => {
    // Url of the specified post (post with the payout declined)
    // /hive/@hiveio/join-hive-at-web3-berlin-june-10-11-2023-the-biggest-crypto-conference-in-europe-community-meetups-and-more
    await postPage.gotoPostPage(
      'hive',
      'hiveio',
      'join-hive-at-web3-berlin-june-10-11-2023-the-biggest-crypto-conference-in-europe-community-meetups-and-more'
    )

    // Validate that the expected post is loaded
    expect(await postPage.articleTitle.textContent())
      .toBe("Join Hive at Web3 Berlin June 10-11, 2023: The Biggest Crypto Conference in Europe, Community Meetups, and more!");
    expect(await postPage.articleAuthorName.textContent()).toBe('hiveio');
    await page.waitForSelector(await postPage.articleFooter['_selector']);
    await postPage.articleFooter.focus();
    // Validate style and title of the declined payout element in the post
    await expect(await page.locator('[data-testid="post-payout-decline"]')).toHaveAttribute('title', 'Payout Declined');
    await expect(await postPage.getElementCssPropertyValue(await page.locator('[data-testid="post-payout-decline"]'), "text-decoration-line"))
      .toBe('line-through');
  })
});

test.describe('Profile page of the muted @techcity', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('validate declined payout in the comment of the muted post of @techcity', async ({ page }) => {
    // Url of the specified post with comment with the payout declined
    // /waivio/@techcity/cleaning-and-descaling-your-vertuo-next-machine#@hivewatchers/rv4x0v
    await postPage.gotoPostPage(
      'waivio',
      'techcity',
      'cleaning-and-descaling-your-vertuo-next-machine#@hivewatchers/rv4x0v'
    )

    // Validate that the expected post is loaded
    expect(await postPage.articleTitle.textContent())
      .toBe("Cleaning and Descaling Your Vertuo Next Machine");
    expect(await postPage.articleAuthorName.textContent()).toBe('techcity');
    await page.waitForSelector(await postPage.articleFooter['_selector']);
    await postPage.articleFooter.focus();
    // Validate style and title of the declined payout element in the post
    await expect(await page.locator('[data-testid="post-payout-decline"]')).toHaveAttribute('title', 'Payout Declined');
    await expect(await postPage.getElementCssPropertyValue(await page.locator('[data-testid="post-payout-decline"]'), "text-decoration-line"))
      .toBe('line-through');
  })
});
