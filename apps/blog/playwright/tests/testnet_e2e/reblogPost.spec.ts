import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostPage } from '../support/pages/postPage';
import {
  waitForPostIsVisibleInUnmoderatedTagPage,
  waitForCreatedCommentIsVisible,
  waitForCircleSpinnerIsDetatched
} from '../support/waitHelper';
import { CommentEditorPage } from '../support/pages/commentEditorPage';
import { generateRandomString } from '../support/utils';
import { ReblogThisPostDialog } from '../support/pages/reblogThisPostDialog';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { ProfilePage } from '../support/pages/profilePage';

test.describe('Reblog a post', () => {
  test.describe.serial('run test in serial', () => {
    test('should the tooltip message of not reblogged post after hovering', async ({
      denserAutoTest4Page
    }) => {
      const homePage = new HomePage(denserAutoTest4Page.page);

      // The tooltip message and colors of the second post
      await homePage.getSecondPostReblogButton.hover();
      expect(await homePage.getFirstPostReblogTooltip.textContent()).toContain('Reblog');
      expect(
        await homePage.getElementCssPropertyValue(await homePage.getFirstPostReblogTooltip, 'color')
      ).toBe('rgb(15, 23, 42)');
      expect(
        await homePage.getElementCssPropertyValue(
          await homePage.getFirstPostReblogTooltip,
          'background-color'
        )
      ).toBe('rgb(247, 247, 247)');
    });

    test('reblog a first post', async ({ denserAutoTest4Page }) => {
      const homePage = new HomePage(denserAutoTest4Page.page);
      const reblogDialog = new ReblogThisPostDialog(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);

      if (await homePage.getFirstPostReblogButton.isEnabled()) {
        await homePage.getFirstPostReblogButton.click();
        await reblogDialog.validateReblogThisPostHeaderIsVisible();
        await reblogDialog.validateReblogThisPostDescriptionIsVisible();
        await expect(reblogDialog.getDialogOkButton).toBeVisible();
        await expect(reblogDialog.getDialogCancelButton).toBeVisible();
        await reblogDialog.clickOkButton();
      }
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(1000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait for reblog button will be viewed again
      await waitForCircleSpinnerIsDetatched(denserAutoTest4Page.page);
      await homePage.getFirstPostReblogButton.waitFor( {state: 'visible'});
      // Validate the reblog icon changed color for red
      await homePage.page.waitForTimeout(1000);
      expect(
        await homePage.getElementCssPropertyValue(homePage.getFirstPostReblogButton, 'color')
      ).toBe('rgb(218, 43, 43)');
    });

    test('reblog a first post validate tooltip after hovering', async ({ denserAutoTest4Page }) => {
      const homePage = new HomePage(denserAutoTest4Page.page);

      // Validate the reblog tooltip after hovering
      await homePage.getFirstPostReblogButton.hover();
      expect(await homePage.getFirstPostReblogTooltip.textContent()).toContain('You reblogged');
    });

    test('validate reblogged post is visible in a blog tab in a user profile page', async ({ denserAutoTest4Page }) => {
      const homePage = new HomePage(denserAutoTest4Page.page);
      const profilePage = new ProfilePage(denserAutoTest4Page.page);

      await profilePage.gotoProfilePage('@' + users.denserautotest4.username);
      await profilePage.profileBlogTabIsSelected();

      // Validate the reblog is visible in the profile page
      expect(await profilePage.firstPostRebloggedLabel.textContent()).toContain(users.denserautotest4.username + ' reblogged');
    });
  });
});
