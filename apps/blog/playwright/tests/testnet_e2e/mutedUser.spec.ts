import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';

test.describe('Muted user - tests', () => {
  let profileUserMenu: ProfileUserMenu;
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let postPage: PostPage;

  test.beforeEach(async ({ denserAutoTest0Page }) => {
    profileUserMenu = new ProfileUserMenu(denserAutoTest0Page.page);
    homePage = new HomePage(denserAutoTest0Page.page);
    profilePage = new ProfilePage(denserAutoTest0Page.page);
    postPage = new PostPage(denserAutoTest0Page.page);
  });

  test('Add user to Muted list', async ({ denserAutoTest0Page }) => {
    const postAuthorName = await denserAutoTest0Page.page.locator(homePage.postAuthor).nth(1).innerText();

    await denserAutoTest0Page.page.locator(homePage.postAuthor).nth(1).click();
    await expect(denserAutoTest0Page.page.locator(profilePage.profileNameString)).toBeVisible();
    await profilePage.muteButton.click();
    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await expect(denserAutoTest0Page.page.locator(profileUserMenu.profileLinkString)).toBeVisible();
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLinkString).click()
    await expect(profilePage.profileName).toContainText('denserautotest0')
    await profilePage.mutedUsersBtn.click()
    await expect(denserAutoTest0Page.page.getByRole('heading', { name: 'Accounts Muted By' })).toBeVisible();
    await expect(denserAutoTest0Page.page.getByRole('link', { name: `${postAuthorName}` })).toBeVisible();
    await profilePage.unmuteButton.click()
    await expect(denserAutoTest0Page.page.getByRole('status')).toBeVisible()
    await expect(denserAutoTest0Page.page.getByText('There are no users on this')).toBeVisible()
    await expect(denserAutoTest0Page.page.getByText('Unmuted', { exact: true })).toBeVisible(); 
  });

  test('Add user to Muted list by - Add Account(s) To List', async ({ denserAutoTest0Page }) => {
    const muteUser = `serejandmyself`

    await denserAutoTest0Page.page.locator(homePage.profileAvatar).click()
    await expect(denserAutoTest0Page.page.locator(profileUserMenu.profileLinkString)).toBeVisible();
    await denserAutoTest0Page.page.locator(profileUserMenu.profileLinkString).click()
    await expect(profilePage.profileName).toContainText('denserautotest0')
    await profilePage.mutedUsersBtn.click()
    await expect(denserAutoTest0Page.page.getByRole('heading', { name: 'Accounts Muted By' })).toBeVisible();
    await denserAutoTest0Page.page.locator('div').filter({ hasText: /^Add Account\(s\) To List\(single account or comma separated list\)$/ }).getByRole('textbox').fill(muteUser);
    await denserAutoTest0Page.page.waitForTimeout(5000)
    await denserAutoTest0Page.page.getByRole('button', { name: 'Add to list' }).click();
    await expect(denserAutoTest0Page.page.getByText('serejandmyself unmute')).toBeVisible();
    await expect(denserAutoTest0Page.page.getByText(`You have muted ${muteUser}`)).toBeVisible();
    await profilePage.unmuteButton.click()
    await expect(denserAutoTest0Page.page.getByText('Unmuted', { exact: true })).toBeVisible();
    await expect(denserAutoTest0Page.page.getByText('There are no users on this')).toBeVisible(); 
  });
});
