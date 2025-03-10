import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './homePage';

export class ProfileUserMenu {
    readonly page: Page;
    readonly homePage: HomePage;
    readonly profileMenuContent: Locator;
    readonly profileUserName: Locator;
    readonly profileLink: Locator;
    readonly notificationsLink: Locator;
    readonly commentsLink: Locator;
    readonly repliesLink: Locator;
    readonly themeModeButton: Locator;
    readonly themeModeItem: Locator;
    readonly themeModeItemLight: Locator;
    readonly themeModeItemDark: Locator;
    readonly themeModeItemSystem: Locator;
    readonly languageTypeButton: Locator;
    readonly walletLink: Locator;
    readonly logoutLink: Locator;
    readonly headerPostList: Locator;
    readonly profileLinkString: string;

    constructor(page: Page) {
        this.page = page;
        this.homePage = new HomePage(page);
        this.profileMenuContent = page.locator('[data-testid="user-profile-menu-content"]');
        this.profileUserName = page.locator('[data-testid="user-name-in-profile-menu"]');
        this.profileLink = page.locator('[data-testid="user-profile-menu-profile-link"]');
        this.notificationsLink = page.locator('[data-testid="user-profile-menu-notifications-link"]');
        this.commentsLink = page.locator('[data-testid="user-profile-menu-comments-link"]');
        this.repliesLink = page.locator('[data-testid="user-profile-menu-replies-link"]');
        this.themeModeButton = page.locator('[data-testid="theme-mode"]');
        this.themeModeItem = page.locator('[data-testid="theme-mode-item"]');
        this.themeModeItemLight = this.themeModeItem.locator(`span:text("Light")`);
        this.themeModeItemDark = this.themeModeItem.locator(`span:text("Dark")`);
        this.themeModeItemSystem = this.themeModeItem.locator(`span:text("System")`);
        this.languageTypeButton = page.locator('[data-testid="toggle-language"]');
        this.walletLink = page.locator('[data-testid="user-profile-menu-wallet-link"]');
        this.logoutLink = page.locator('[data-testid="user-profile-menu-logout-link"]');
        this.headerPostList = page.getByTestId('community-name').locator('..').locator('..');
        this.profileLinkString = '[data-testid="user-profile-menu-profile-link"]'
    }

    async validateUserProfileManuIsOpen() {
        await expect(this.profileMenuContent).toBeVisible();
    }

    async validateUserNameInProfileMenu(username: string){
        await expect(this.profileUserName).toHaveText(username);
    }

    async clickCloseProfileMenu() {
        this.headerPostList.click({force: true});
    }

    async setTheme(thememode: string) {
      // Set the dark theme - first click profile avatar
      // Click avatar of the user
      await this.homePage.profileAvatarButton.click();
      // Validate User is logged in
      await this.page.waitForSelector(this.profileMenuContent['_selector']);
      // Click Theme button
      await this.themeModeButton.dispatchEvent('pointerdown');
      // Click Dark theme
      await this.themeModeItem.locator(`span:text(\"${thememode}\")`).click();
    }
}
