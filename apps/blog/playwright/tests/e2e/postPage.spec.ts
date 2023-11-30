import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { HomePage } from '../support/pages/homePage';
import { ApiHelper } from '../support/apiHelper';
import { CommunitiesPage } from '../support/pages/communitiesPage';

test.describe('Post page tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let apiHelper: ApiHelper;
  let communityPage: CommunitiesPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    apiHelper = new ApiHelper(page);
    communityPage = new CommunitiesPage(page);
  });

  test('move to the first post content on the home page by image', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
  });

  test('move to the first post content on the home page by title of this post', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByPostTitle();
  });

  test('validate that title of the post is the same as inside the post', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByPostTitle();
  });

  test('validate the post content pages styles in the dark theme', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByPostTitle();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    expect(await postPage.getElementCssPropertyValue(postPage.articleTitle, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.articleTitle, 'color')).toBe(
      'rgb(225, 231, 239)'
    );

    expect(await postPage.getElementCssPropertyValue(postPage.articleAuthorData, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.articleAuthorData, 'color')).toBe(
      'rgb(100, 116, 139)'
    );

    expect(await postPage.getElementCssPropertyValue(postPage.articleBody, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.articleBody, 'color')).toBe(
      'rgb(209, 213, 219)'
    );
  });

  test('validate the hover card with author info is displayed after hover username in the post', async ({
    page
  }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
    await postPage.articleAuthorName.hover();
    await expect(postPage.userHoverCard).toBeVisible();
  });

  test('validate followers and following in the hover card', async ({ page }) => {
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

    if (await userPostingJsonMetadata.profile && userPostingJsonMetadata.profile.about) {
      userAboutAPI =
        userPostingJsonMetadata.profile.about.slice(0, 157) +
        (157 < userPostingJsonMetadata.profile.about.length ? '...' : '');
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    } else {
      userAboutAPI = '';
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    }
  });

  test('validate Follow button style in the hover card in light theme', async ({ page }) => {
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
      'rgb(220, 38, 38)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'background-color')
    ).toBe('rgb(241, 245, 249)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  test('validate Follow button style in the hover card in dark theme', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

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
      'rgb(220, 38, 38)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'background-color')
    ).toBe('rgb(29, 40, 58)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  test('validate styles of the hover card in dark mode', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await postPage.articleAuthorName.hover();

    expect(await postPage.getElementCssPropertyValue(postPage.userHoverCard, 'background-color')).toBe(
      'rgb(3, 7, 17)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.userHoverCard, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
  });

  // Mute button is no more in the dropdown card after hovering that way test is skipped.
  test.skip('validate Mute button style in the hover card in light theme', async ({ page }) => {
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

  test('validate the post footer is visible', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();
    await expect(postPage.articleFooter).toBeVisible();
  });

  // new tests

  test('Validate Post Header - Timestamp, Post Footer - Timestamp', async ({page}) => {
    await postPage.gotoHomePage();
    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible()

    const timestampText = await homePage.getFirstPostCardTimestampLink.innerText()
    await homePage.getFirstPostCardTimestampLink.click()
    await expect(page.locator('span[title]').nth(1)).toBeVisible()
    await expect(page.locator('span[title]').nth(1)).toHaveText(timestampText)

    await expect(page.locator('.px-1').first()).toHaveText(timestampText)
  })

  test('Post Footer - Authored by', async ({page, browserName}) =>{
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    await postPage.gotoHomePage();
    const firstPostAuthor = await homePage.getFirstPostAuthor.innerText()

    await postPage.moveToTheFirstPostInHomePageByImage();
    await expect(postPage.footerAuthorName).toBeVisible()

    const footerAuthorName = await page.locator('[data-testid="author-name-link"]').nth(1).innerText()

    await expect(firstPostAuthor).toEqual(footerAuthorName)
  })

  test('Post Header/Footer - Affiliation tag', async ({page}) =>{
    await page.goto('/hive-160391/@gtg/gtg-witness-update-upcoming-changes-in-hbd-apr');
    await page.waitForLoadState('networkidle');

    const labelText = await postPage.postLabel.innerText()
    const labelFooterText = await postPage.postLabelFooter.innerText()
    await expect(postPage.postLabel).toBeVisible()
    await expect(postPage.postLabelFooter).toBeVisible()

    await expect(labelText).toEqual(labelFooterText)
  })

  test('Check: Post Content, Post Content - Image', async ({page}) =>{
    await postPage.gotoHomePage();
    await postPage.postImage.first().click()
    await expect(postPage.articleBody).toBeVisible();

    const imgElement = await page.$('img') || await page.$('iframe');

    if (imgElement) {
      const imgSrc = await imgElement.getAttribute('src');

      if (imgSrc) {

        console.log('Strona zawiera obrazek. Ścieżka do obrazka: ' + imgSrc);
      } else {
        console.log('Strona zawiera element <img>, ale nie ma zdefiniowanej ścieżki do obrazka.');
      }
    } else {
      console.log('Strona nie zawiera elementu <img>.');
      test.fail();
    }
  })

  test("Validate Post footer", async ({page, request}) =>{
    await postPage.gotoHomePage();
    await postPage.postImage.first().click()
    await expect(postPage.articleBody).toBeVisible();


    await test.step("Post Footer - Community Link", async () => {
    const footerCommunityLink = await postPage.footerCommunityLink

    await expect(footerCommunityLink).toBeVisible()
    await expect(footerCommunityLink.getAttribute('href')).toBeTruthy()

    await footerCommunityLink.click()

    const communityNameText = await communityPage.communityNameTitle.textContent()
    await expect(communityPage.communityNameTitle).toBeVisible()

    await page.goBack()
    })


    await test.step("Post Footer - Author Link", async () => {
    await expect(postPage.footerAuthorName).toBeVisible()
    await expect(postPage.footerAuthorName.getAttribute('href')).toBeTruthy()
    await postPage.footerAuthorNameFirst.click()
    await expect(postPage.hoverCardUserAvatar).toBeVisible()
    })


    await test.step("Post Footer - Upvote and Downvote", async () => {
    await expect(postPage.votesButtons).toBeVisible()
    })

    //
    await test.step("Post Footer - Payout", async () => {
    await expect(postPage.footerPayouts).toBeVisible()
    })

    //
    await test.step("Post Footer - Votes", async () => {
    await expect(postPage.postFooterVotes.first()).toBeVisible()
    })


    await test.step("Post Footer - Reblog", async () => {
    await expect(postPage.footerReblogBtn).toBeVisible()
    await postPage.footerReblogBtn.click()
    await expect(postPage.reblogDialogHeader).toBeVisible()
    await expect(postPage.reblogDialogHeader).toHaveText('Reblog This Post')

    await expect(postPage.reblogDialogDescription).toBeVisible()
    await expect(postPage.reblogDialogDescription).toHaveText('This post will be added to your blog and shared with your followers.')

    await expect(postPage.reblogDialogCancelBtn).toBeVisible()
    await expect(postPage.reblogDialogOkBtn).toBeVisible()

    await expect(postPage.reblogDialogCloseBtn).toBeVisible()
    await (postPage.reblogDialogCloseBtn).click()
    })

    //
    await test.step("Post Footer - Reply", async () => {
      await expect(postPage.commentReplay).toBeVisible()
      await postPage.commentReplay.click()
      await expect(postPage.commentCardsFooterReplyEditor).toBeVisible()
    })

    await test.step("Post Footer - Responses", async () => {
      await expect(postPage.commentResponse).toBeVisible()
    })

    await test.step("Post Footer - Social Media links", async () => {
      await expect(postPage.facebookIcon).toBeVisible()
      await expect(postPage.twitterIcon).toBeVisible()
      await expect(postPage.linkedinIcon).toBeVisible()
      await expect(postPage.redditIcon).toBeVisible()
    })

    await test.step("Post Footer - Share this post link", async () => {
      await expect(postPage.sharePostBtn).toBeVisible()
      await postPage.sharePostBtn.click()
      await expect(postPage.sharePostFrame).toBeVisible()
      await expect(postPage.sharePostFrame).toContainText('Share this post')
    })

    await test.step("Post Footer - Hash tags", async () => {
      await expect(postPage.hashtagsPosts).toBeVisible()

    })
  })

  test('validate styles of the hover card in dark mode by hovering user link in the footer post', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await postPage.footerAuthorNameLink.hover();

    expect(await postPage.getElementCssPropertyValue(postPage.userHoverCard, 'background-color')).toBe(
      'rgb(3, 7, 17)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.userHoverCard, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
  });

  test('validate Follow button style in the hover card in dark theme by hovering the footer post author link', async ({ page }) => {
    await postPage.gotoHomePage();
    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await postPage.footerAuthorNameLink.hover();

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
      'rgb(220, 38, 38)'
    );
    expect(
      await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'background-color')
    ).toBe('rgb(29, 40, 58)');
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(await postPage.getElementCssPropertyValue(postPage.buttonFollowHoverCard, 'border-style')).toBe(
      'solid'
    );
  });

  test('validate followers and following in the hover card by hovering the footer post author link (dark mode)', async ({ page }) => {
    await postPage.gotoHomePage();
    const firstPostAuthorName = (await homePage.getFirstPostAuthor.innerText()).trim().replace('@', '');
    // console.log("First post's author name without @: ", await firstPostAuthorName);

    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await postPage.footerAuthorNameLink.hover();

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

  test('validate user about in the hover card by hovering the footer post author link (dark mode)', async ({ page }) => {
    await postPage.gotoHomePage();
    const firstPostAuthorName = (await homePage.getFirstPostAuthor.innerText()).trim().replace('@', '');

    await postPage.moveToTheFirstPostInHomePageByImage();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await postPage.footerAuthorNameLink.hover();

    const userPostingJsonMetadata = await JSON.parse(
      (
        await apiHelper.getAccountInfoAPI(firstPostAuthorName)
      )['result'][0].posting_json_metadata
    );

    let userAboutAPI: any;
    if (await userPostingJsonMetadata.profile && userPostingJsonMetadata.profile.about) {
      userAboutAPI =
        userPostingJsonMetadata.profile.about.slice(0, 157) +
        (157 < userPostingJsonMetadata.profile.about.length ? '...' : '');
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    } else {
      userAboutAPI = '';
      // console.log('userAboutAPI: ', await userAboutAPI);
      expect(await postPage.userAboutHoverCard.textContent()).toBe(userAboutAPI);
    }
  });
});
