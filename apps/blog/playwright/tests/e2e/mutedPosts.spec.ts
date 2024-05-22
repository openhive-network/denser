import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommentViewPage } from '../support/pages/commentViewPage';

test.describe('Muted posts tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;
  let commentViewPage: CommentViewPage;

  test.beforeEach(async ({ page, browserName }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
    commentViewPage = new CommentViewPage(page);
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
  });

  test('Check if properly go to muted posts', async ({ page }) => {
    await page.goto('/');
    await homePage.moveToMutedPosts();
    await page.waitForRequest('https://api.hive.blog/');
    const dropDownText = await homePage.getFilterPosts.innerText();

    expect(dropDownText).toEqual('Muted');
  });

  test('Check if posts in muted tab are display correctly', async ({ page, request }) => {
    await page.goto('/muted');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'muted', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const postAuthor = (await response.json()).result[0].author;
    const postAuthorReputation = (await response.json()).result[0].author_reputation;
    const postAuthorReputationRounded = Math.floor(postAuthorReputation);

    const firstPost = await homePage.getMainTimeLineOfPosts.first();
    await expect(firstPost).toBeVisible();
    await expect(firstPost).toHaveClass('opacity-50 hover:opacity-100');

    const firstReputation = await homePage.getMainTimeLineOfPosts.first().locator(postPage.reputationValue);
    const firstReputationText = await firstReputation.innerText();
    const numberInParantheses = await firstReputationText.replace(/\(|\)/g, '');
    const numberFirstReputation = await parseInt(numberInParantheses);

    // check if correct reputation value is displayed
    await expect(postAuthorReputationRounded).toEqual(numberFirstReputation);
    // check if reputation is less than 0
    await expect(numberFirstReputation).toBeLessThan(1);

    // check if post picture is visible
    const numberOfImagesInPostCard = await postPage.page
      .locator('li[data-testid="post-list-item"]:nth-of-type(1):has(img)')
      .count();
    if (numberOfImagesInPostCard <= 0)
      await expect(postPage.firstPostImageOnHomePage).toHaveCount(0);
    else
      await expect(postPage.firstPostImageOnHomePage).toHaveCount(1);

    // check if post author name is visivble
    await expect(homePage.getFirstPostAuthor).toBeVisible();

    // check if correct author name is displayed
    const authorName = await homePage.getFirstPostAuthor.innerText();
    await expect(authorName).toEqual(postAuthor);

    // check if upvote button is visible
    const firstUpvoteButton = homePage.getUpvoteButton.first();
    await expect(firstUpvoteButton).toBeVisible();

    // check if downvote button is visible
    const firstDownvoteButton = homePage.getDownvoteButton.first();
    await expect(firstDownvoteButton).toBeVisible();

    // check if after mouse hover posts has opacity 1
    await firstPost.hover();
    await expect(firstPost).toHaveCSS('opacity', '1');
  });

  test('Check if muted posts are displayed correctly', async ({ page, request }) => {
    await page.goto('/muted');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'muted', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const postAuthor = (await response.json()).result[0].author;
    await postPage.moveToTheFirstPostInHomePageByPostTitle();

    const articleAuthor = postPage.articleAuthorName;
    const articleAuthorText = await postPage.articleAuthorName.innerText();
    await expect(articleAuthor).toBeVisible();
    await expect(articleAuthorText).toContain(postAuthor);
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.articleFooter).toBeVisible();
  });

  test('Check if posts list in  muted tab is displayed correctly', async ({page}) =>{
    await page.goto('/muted');

    await expect(homePage.getFirstPostAuthor).toBeVisible()
    await expect(postPage.postImage).not.toBeVisible()
  })

  test('Check if image in muted tests are not displayed', async ({page}) =>{
    await page.goto('/muted');
    await postPage.moveToTheFirstPostInHomePageByPostTitle();

    if (await postPage.mutedPostsBannedImageText.isVisible())
      await expect(postPage.mutedPostsBannedImageText).toHaveText('(Image not shown due to low ratings)');
    else
      console.log('There is not any hidden images inside the muted post');
  })

  test('Check if re comment work correctly', async ({page}) =>{
    await page.goto('/muted');

    await expect (profilePage.postBlogItem.first()).toBeVisible();

    const postListItems = await page.$$('[data-testid="post-list-item"]');

    for (const postItem of postListItems) {
      const textContent: any = await postItem.textContent();
      if (textContent.includes('RE:')) {
        const postTittle = await postItem.$$('[data-testid="post-title"] > a');

        if (postTittle.length > 0) {

          await postTittle[0].click();
          await page.waitForSelector(commentViewPage.commentGreenSection['_selector']);
          await expect(commentViewPage.commentGreenSection).toBeVisible();
          break;
        }
      } else {
        console.warn('There was no any RE: post');
      }
    }
  })
});
