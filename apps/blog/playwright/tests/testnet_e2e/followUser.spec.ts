import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';

test.describe('Follow user - tests', () => {
  let profileUserMenu: ProfileUserMenu;
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let postPage: PostPage;

  test.beforeEach(async ({ denserAutoTest0Page, page }) => {
    profileUserMenu = new ProfileUserMenu(page);
    homePage = new HomePage(page);
    profilePage = new ProfilePage(page);
    postPage = new PostPage(page);
  });

  test('Add user to follow list - user account', async ({ denserAutoTest0Page }) => {
    const secondPostAuthor = await denserAutoTest0Page.page.locator(homePage.postAuthor).nth(1).innerText()

    await denserAutoTest0Page.page.locator(homePage.postAuthor).nth(1).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileNameString)).toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.followBtn)).toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.followBtn)).toContainText('Follow')
    await denserAutoTest0Page.page.locator(profilePage.followBtn).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.followBtn)).toContainText('Unfollow')

    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLink).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('1 following')
    await denserAutoTest0Page.page.getByText('1 following').click()
    await expect(denserAutoTest0Page.page.getByRole('link', { name: `${secondPostAuthor}` })).toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.followBtn)).toContainText('Unfollow')
    await denserAutoTest0Page.page.locator(profilePage.followBtn).click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${secondPostAuthor}` })).not.toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('Not following anybody')
  });

  test('Add user to follow list from post', async ({ denserAutoTest0Page }) => {
    const postAuthor = await denserAutoTest0Page.page.locator(homePage.postAuthor).first().innerText()
    
    await expect(denserAutoTest0Page.page.locator(homePage.postsImages).first()).toBeVisible()
    await denserAutoTest0Page.page.locator(homePage.postsImages).first().click({force: true})
    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString).first()).toBeVisible()
    await denserAutoTest0Page.page.locator(postPage.articleAuthor).first().click()
    await expect(denserAutoTest0Page.page.locator(postPage.userPopoverCardContent)).toBeVisible()
    await denserAutoTest0Page.page.locator(postPage.profileFollowBtn).click()
    await expect(denserAutoTest0Page.page.locator(postPage.profileFollowBtn)).toContainText('Unfollow')

    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLink).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('1 following')
    await denserAutoTest0Page.page.getByText('1 following').click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${postAuthor}` })).toBeVisible()

    await denserAutoTest0Page.page.locator(profilePage.followBtn).click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${postAuthor}` })).not.toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('Not following anybody')
  });

  test('Add user to follow list from comment', async ({ denserAutoTest0Page }) => {
    await expect(denserAutoTest0Page.page.locator(homePage.postsImages).first()).toBeVisible()
    await denserAutoTest0Page.page.locator(homePage.postsImages).first().click({force: true})
    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString).first()).toBeVisible()
    await denserAutoTest0Page.page.mouse.wheel(0, 2000)
    await expect(denserAutoTest0Page.page.locator(postPage.commentCard).first()).toBeVisible()

    const commentAuthorName = await denserAutoTest0Page.page.locator(postPage.commentListItem).first().locator(postPage.articleAuthor).first()
    const commentAuthorNameText = await commentAuthorName.innerText()

    await denserAutoTest0Page.page.locator(postPage.commentListItem).first().locator(postPage.articleAuthor).first().click()

    await denserAutoTest0Page.page.locator(postPage.profileFollowBtn).click()
    await expect(denserAutoTest0Page.page.locator(postPage.profileFollowBtn)).toContainText('Unfollow')

    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLink).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('1 following')
    await denserAutoTest0Page.page.getByText('1 following').click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${commentAuthorNameText}` })).toBeVisible()

    await denserAutoTest0Page.page.locator(profilePage.followBtn).click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${commentAuthorNameText}` })).not.toBeVisible()
    await denserAutoTest0Page.page.waitForSelector(profilePage.profileStatsString)
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('Not following anybody')
  });
});
