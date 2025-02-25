import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { ProfilePage } from '../support/pages/profilePage';

test.describe('Follow user - tests', () => {
  let profileUserMenu: ProfileUserMenu;
  let homePage: HomePage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ denserAutoTest0Page, page }) => {
    profileUserMenu = new ProfileUserMenu(page);
    homePage = new HomePage(page)
    profilePage = new ProfilePage(page)
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
    await denserAutoTest0Page.page.waitForTimeout(5000)
    await expect(denserAutoTest0Page.page.locator('[data-testid="post-image"]').first()).toBeVisible()
    await denserAutoTest0Page.page.locator('[data-testid="post-image"]').first().click({force: true})
    await expect(denserAutoTest0Page.page.locator('[id="articleBody"]').first()).toBeVisible()
    await denserAutoTest0Page.page.getByTestId('author-data').getByTestId('author-name-link').click()
    await expect(denserAutoTest0Page.page.getByTestId('user-popover-card-content')).toBeVisible()
    await denserAutoTest0Page.page.getByTestId('profile-follow-button').click()
    await expect(denserAutoTest0Page.page.getByTestId('profile-follow-button')).toContainText('Unfollow')

    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLink).click()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('1 following')
    await denserAutoTest0Page.page.getByText('1 following').click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${postAuthor}` })).toBeVisible()

    await denserAutoTest0Page.page.locator(profilePage.followBtn).click()
    expect(denserAutoTest0Page.page.getByRole('link', { name: `${postAuthor}` })).not.toBeVisible()
    await expect(denserAutoTest0Page.page.locator(profilePage.profileStatsString)).toContainText('Not following anybody')
  });
});
