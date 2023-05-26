import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { HomePage } from '../support/pages/homePage';
import { ApiHelper } from '../support/apiHelper';

test.describe('Post page tests', () => {
  test('move to the first post content on the home page by image', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
  });

  test('move to the first post content on the home page by title of this post', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByPostTitle();
  });

  test('validate that title of the post is the same as inside the post', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByPostTitle();
  });

  test('validate the hover card with author info is displayed after hover username in the post', async ({
    page
  }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
    await postPage.articleAuthorName.hover();
    await expect(postPage.userHoverCard).toBeVisible();
  });

  test('validate followers and following in the hover card', async ({ page }) => {
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);
    const apiHelper = new ApiHelper(page);

    await postPage.gotoHomePage();
    const firstPostAuthorName = (await homePage.getFirstPostAuthor.innerText()).trim().replace('@', '');
    // console.log("First post's author name without @: ", await firstPostAuthorName);

    await postPage.moveToTheFirstPostInHomePageByImage();
    await postPage.articleAuthorName.hover();

    const userFollowersAPI = (await apiHelper.getFollowCountAPI(firstPostAuthorName))['result']
      .follower_count;
    const userFollowersAPIString = `${userFollowersAPI}Followers`;
    expect(await postPage.userFollowersHoverCard.textContent()).toBe(userFollowersAPIString);

    const userFollowingAPI = (await apiHelper.getFollowCountAPI(firstPostAuthorName))['result']
      .following_count;
    const userFollowingAPIString = `${userFollowingAPI}Following`;
    expect(await postPage.userFollowingHoverCard.textContent()).toBe(userFollowingAPIString);

    // console.log('API get_accounts: ', await apiHelper.getAccountInfoAPI(firstPostAuthorName));
    // console.log('API get_follow_count: ', await apiHelper.getFollowCountAPI(firstPostAuthorName));
    // console.log('API get_ranked_posts: ', await apiHelper.getRankedPostsAPI());
    // console.log('API get_list_communities: ', await apiHelper.getListCommunitiesAPI());
  });

  test('validate user about in the hover card', async ({ page }) => {
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);
    const apiHelper = new ApiHelper(page);

    await postPage.gotoHomePage();
    const firstPostAuthorName = (await homePage.getFirstPostAuthor.innerText()).trim().replace('@', '');

    await postPage.moveToTheFirstPostInHomePageByImage();
    await postPage.articleAuthorName.hover();

    const userPostingJsonMetadata = await JSON.parse(
      (
        await apiHelper.getAccountInfoAPI(firstPostAuthorName)
      )['result'][0].posting_json_metadata
    );

    let userAboutAPI: any;
    if (userPostingJsonMetadata.profile.about) {
      userAboutAPI = await userPostingJsonMetadata.profile.about;
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    } else {
      userAboutAPI = '';
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    }
  });

  test('validate Follow button style in the hover card in light theme', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await postPage.articleAuthorName.hover();

    // button styles
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'background-color')
    ).toBe('rgba(0, 0, 0, 0)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-style')).toBe(
      'solid'
    );

    // button styles when hovered over it
    await postPage.buttonFollowHoverCard.hover();
    await postPage.page.waitForTimeout(1000);

    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'background-color')
    ).toBe('rgb(254, 226, 226)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  // TO DO the above test for dark theme when it will work

  test('validate Mute button style in the hover card in light theme', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await postPage.articleAuthorName.hover();

    // button styles
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'border-color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'border-style')).toBe(
      'solid'
    );

    // button styles when hovered over it
    await postPage.buttonMuteHoverCard.hover();
    await postPage.page.waitForTimeout(1000);

    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'background-color')).toBe(
      'rgb(254, 226, 226)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'border-color')).toBe(
      'rgb(239, 68, 68)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonMuteHoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  // TO DO the above test for dark theme when it will work

  test('validate the post footer is visible', async ({ page }) => {
    const postPage = new PostPage(page);

    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
    await expect(postPage.articleFooter).toBeVisible();
  });
});
