import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { CommentViewPage } from '../support/pages/commentViewPage';

test.describe('Profile page of @gtg', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;
  let communitiesPage: CommunitiesPage;
  let commentViewPage: CommentViewPage;

  test.beforeEach(async ({ page, browserName }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
    communitiesPage = new CommunitiesPage(page);
    commentViewPage = new CommentViewPage(page);

    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
  });

  test('Tab Posts - Posts - List', async ({ page, request }) => {
    await page.goto('/@gtg/posts');
    await expect(profilePage.postBlogItem.first()).toBeVisible();
    const post = await profilePage.postBlogItem.all();
    const postLenght = await post.length;

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_account_posts',
        params: { sort: 'comments', account: 'gtg', start_author: '', start_permlink: '', limit: 20 }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const postAmount = (await response.json()).result;
    const postAmountLenght = postAmount.length;

    await expect(postAmountLenght).toEqual(postLenght);

    await page.evaluate(() => {
      window.scrollBy(0, 3000);
    });

    await expect(profilePage.postBlogItem.nth(21)).toBeVisible();

    const postScrolled = await profilePage.postBlogItem.all();
    const postScrolledLenght = await postScrolled.length;
    const expectedPostsAmount = postAmountLenght * 2;

    await expect(postScrolledLenght).toEqual(expectedPostsAmount);
  });

  test('Tab Posts - Posts Card Header- Avatar', async ({ page }) => {
    await page.goto('/@gtg/posts');
    await expect(profilePage.postBlogItem.first()).toBeVisible();
    await homePage.getPostCardAvatar.first().click();
    await page.waitForURL('/@gtg');
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(profilePage.blogTabPostsContainer).toBeVisible();
  });

  test('Tab Posts - Posts Card Header - NickName Link', async ({ page }) => {
    await page.goto('/@gtg/posts');
    await expect(profilePage.postBlogItem.first()).toBeVisible();
    await homePage.getFirstPostAuthor.click();
    await page.waitForURL('/@gtg');
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(profilePage.blogTabPostsContainer).toBeVisible();
  });

  test('Tab Posts - Posts Card Header - Timestamp Link', async ({ page }) => {
    await page.goto('/@gtg/posts');
    await expect(profilePage.postBlogItem.first()).toBeVisible();
    await homePage.getFirstPostCardTimestampLink.click();
    await page.waitForTimeout(5000);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('Tab Posts - Comments - List', async ({ page, request }) => {
    await page.goto('/@gtg/comments');
    await expect(postPage.commentListItems.first()).toBeVisible();
    const comments = await postPage.commentListItems.all();
    const commentsLenght = await comments.length;

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_account_posts',
        params: { sort: 'comments', account: 'gtg', start_author: '', start_permlink: '', limit: 20 }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const postAmount = (await response.json()).result;
    const postAmountLenght = postAmount.length;

    console.log(postAmount.length);

    await expect(postAmountLenght).toEqual(commentsLenght);

    await page.evaluate(() => {
      window.scrollBy(0, 3000);
    });
    await expect(postPage.commentListItems.first()).toBeVisible();
    const commentsScrolled = await postPage.commentListItems.all();
    const commentsScrolledLenght = commentsScrolled.length;
    console.log(commentsScrolledLenght);
    // await expect(commentsScrolled).toHaveLength(20)

    await expect(postPage.commentListItems.nth(21)).toBeVisible();

    const postScrolled = await postPage.commentListItems.all();
    const postScrolledLenght = await postScrolled.length;
    const expectedPostsAmount = postAmountLenght * 2;

    await expect(postScrolledLenght).toEqual(expectedPostsAmount);
  });

  test('Tab Posts - Comments Header - Avatar', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await page.waitForURL('/@gtg/comments');
    await expect(postPage.commentListItems.first()).toBeVisible();
    await postPage.postsCommentsFirstAvatar.click();
    await page.waitForURL('/@gtg');
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(profilePage.blogTabPostsContainer).toBeVisible();
  });

  test('Tab Posts - Comments Header - NickName Link', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await page.waitForURL('/@gtg/comments');
    await expect(postPage.commentListItems.first()).toBeVisible();
    await homePage.getFirstPostAuthor.click();
    await page.waitForURL('/@gtg');
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(profilePage.blogTabPostsContainer).toBeVisible();
  });

  test('Tab Posts - Comments Header - Community Name Link', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await page.waitForURL('/@gtg/comments');
    await expect(postPage.commentListItems.first()).toBeVisible();

    const firstCommunityName = await profilePage.firstCommunityLinkPostsComments.textContent();

    await profilePage.firstCommunityLinkPostsComments.click();
    await expect(profilePage.communityName).toBeVisible();
    await expect(profilePage.communityName).toHaveText(`${firstCommunityName}`);
  });

  test('Tab Posts - Comments Header - Timestamp Link', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await expect(postPage.commentCardsTitles.first()).toBeVisible();
    const commentTittText = await postPage.commentCardsTitles.first().textContent();

    await expect(postPage.commentListItems.first()).toBeVisible();
    await profilePage.communityTimeStamp.click();
    await page.waitForTimeout(2000);
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.articleTitle).toBeVisible();
    await expect(postPage.articleTitle).toHaveText(`${commentTittText}`);
  });

  test('Tab Posts - Comment Card Footer - Payout Amount', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await expect(commentViewPage.getResponseCommentPayout.first()).toBeVisible();
    await page.waitForTimeout(2000);
    const firstPayout = await commentViewPage.getResponseCommentPayout.first();
    const payoutText = await commentViewPage.getResponseCommentPayout.first().textContent();
    await expect(commentViewPage.getResponseCommentPayout.first()).toBeVisible();

    if (payoutText.includes('0.00')) {
      if (await firstPayout.getAttribute('data-state') == 'closed') {
        await commentViewPage.getResponseCommentPayout.first().hover();
        await commentViewPage.page.waitForTimeout(1000);
        await expect(commentViewPage.getResponseCommentPayout.first()).toHaveCSS('color', 'rgb(218, 43, 43)');
      } else {
      await commentViewPage.getResponseCommentPayout.first().hover();
      await commentViewPage.page.waitForTimeout(1000);
      await expect(commentViewPage.getResponseCommentPayout.first()).toHaveCSS('color', 'rgb(24, 30, 42)');
      }
    } else {
      await commentViewPage.getResponseCommentPayout.first().hover();
      await commentViewPage.page.waitForTimeout(1000);
      await expect(commentViewPage.getResponseCommentPayout.first()).toHaveCSS('color', 'rgb(218, 43, 43)');
      await expect(commentViewPage.payoutPostCardTooltip).toBeVisible();
    }
  });

  test('Tab Posts - Comment Card Footer - Votes', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await expect(commentViewPage.getResponseCommentPayout.first()).toBeVisible();
    const commentVoteText = await commentViewPage.commentVote.first().textContent();
    await commentViewPage.commentVote.first().hover();

    if (commentVoteText === '0') {
      await expect(await commentViewPage.commentVoteTooltip.first().textContent()).toContain('no vote');
    } else if (commentVoteText === '1') {
      await expect(await commentViewPage.commentVoteTooltip.first().textContent()).toContain('vote');
    } else if (commentVoteText !== '1') {
      await expect(await commentViewPage.commentVoteTooltip.first().textContent()).toContain('votes');
    }
  });

  test('Tab Posts - Comment Card Footer - Response', async ({ page }) => {
    await page.goto('/@gtg/comments');
    await expect(postPage.commentListItems.first()).toBeVisible();
    await page.locator('button > a').first().click();
    await expect(page.locator('h4.text-sm')).toBeVisible();
    await expect(page.locator('h4.text-sm')).toHaveText("You are viewing a single comment's thread from:");
  });

  test('Tab Posts - Payouts - List', async ({ page, request }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);
    const post = await profilePage.postBlogItem.all();
    const postLenght = await post.length;

    if (await profilePage.postBlogItem.first().isVisible())
      await expect(profilePage.postBlogItem.first()).toBeVisible();
    if (await profilePage.userNoPendingPayoutsMsg.isVisible())
      await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');

    console.log(postLenght);
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_account_posts',
        params: { sort: 'payout', account: 'gtg', start_author: '', start_permlink: '', limit: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const postAmount = (await response.json()).result;
    const postAmountLenght = postAmount.length;

    console.log(postAmountLenght);
    await expect(postLenght).toEqual(postAmountLenght);
  });

  test('Tab Payouts - Post Card Header - Avatar', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(10000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();
      await homePage.getPostCardAvatar.first().locator('div').click();
      // await page.waitForURL('/@gtg');
      await page.waitForTimeout(10000);
      await expect(profilePage.profileBlogLink).toBeVisible();
      await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(profilePage.blogTabPostsContainer).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - Post Card Header - NickName Link', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(10000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();
      await homePage.getFirstPostAuthor.click();
      await page.waitForURL('/@gtg');
      await expect(profilePage.profileBlogLink).toBeVisible();
      await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(profilePage.blogTabPostsContainer).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - Post Card Header - Community Link', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();
      const firstCommunityName = await profilePage.firstCommunityLinkPostsComments.textContent();

      await profilePage.firstCommunityLinkPostsComments.click();
      await expect(profilePage.communityName).toBeVisible();
      await expect(profilePage.communityName).toHaveText(`${firstCommunityName}`);
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - Post Card Header - Timestamp', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();
      await profilePage.communityTimeStamp.hover();
      await expect(profilePage.communityTimeStamp).toHaveCSS('color', 'rgb(218, 43, 43)');

      const tittleText = await homePage.postTitle.first().textContent();

      await profilePage.communityTimeStamp.click();

      if (tittleText?.includes('RE:')) {
        await expect(commentViewPage.commentGreenSection).toBeVisible();
      } else {
        await expect(postPage.articleBody).toBeVisible();
        const plenght = (await page.locator('#articleBody p').all()).length;

        await expect(plenght).toBeGreaterThan(1);
      }
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card Header - Avatar', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postCardAvatarElements = await postItem.$$('[data-testid="post-card-avatar"]');

          if (postCardAvatarElements.length > 0) {
            await postCardAvatarElements[0].click();
            break;
          }
        }
      }
      await page.waitForTimeout(10000);
      await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(profilePage.blogTabPostsContainer).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card Header - NickName Link', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postAuthor = await postItem.$$('[data-testid="post-author"]');

          if (postAuthor.length > 0) {
            await postAuthor[0].click();
            break;
          }
        }
      }
      await page.waitForTimeout(10000);
      await expect(profilePage.profileBlogLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(profilePage.blogTabPostsContainer).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card Header - Timestamp', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(4000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent.includes('RE:')) {
          const postCardTimestamp = await postItem.$$('[data-testid="post-card-timestamp"]');

          if (postCardTimestamp.length > 0) {
            await postCardTimestamp[0].click();
            break;
          }
        }
      }
      await page.waitForTimeout(10000);
      await expect(commentViewPage.commentGreenSection).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card - Title', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postTittle = await postItem.$$('.p-1 [data-testid="post-title"] > a');

          if (postTittle.length > 0) {
            await postTittle[0].click();
            break;
          }
        }
      }

      await expect(commentViewPage.commentGreenSection).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card - Description', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postDescription = await postItem.$$('[data-testid="post-description"]');

          if (postDescription.length > 0) {
            await postDescription[0].click();
            break;
          }
        }
      }
      await page.waitForTimeout(10000);
      await expect(commentViewPage.commentGreenSection).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card Footer - Response', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postDescription = await postItem.$$('[data-testid="post-children"]');

          if (postDescription.length > 0) {
            await postDescription[0].click();
            break;
          }
        }
      }
      await page.waitForTimeout(10000);
      await expect(commentViewPage.commentGreenSection).toBeVisible();
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });

  test('Tab Payouts - ReComment Card Footer - Reblog', async ({ page }) => {
    await page.goto('/@gtg/payout');
    await page.waitForTimeout(3000);

    if (await profilePage.postBlogItem.first().isVisible()) {
      await expect(profilePage.postBlogItem.first()).toBeVisible();

      const postListItems = await page.$$('[data-testid="post-list-item"]');

      for (const postItem of postListItems) {
        const textContent = await postItem.textContent();
        if (textContent?.includes('RE:')) {
          const postDescription = await postItem.$('[data-testid="post-card-reblog"]');

          if (postDescription) {
            await postDescription.click();
            break;
          } else {
            console.log(
              'Element [data-testid="post-card-reblog"] nie istnieje dla tego elementu z tekstem "RE:"'
            );
          }
        }
      }
    } else await expect(profilePage.userNoPendingPayoutsMsg).toHaveText('No pending payouts.');
  });
});
