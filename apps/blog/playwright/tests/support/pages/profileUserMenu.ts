import { Locator, Page, expect } from '@playwright/test';

export class ProfileUserMenu {
    readonly page: Page;
    readonly profileMenuContent: Locator;
    readonly profileUserName: Locator;
    readonly profileLink: string;
    readonly notificationsLink: Locator;
    readonly commentsLink: Locator;
    readonly repliesLink: Locator;
    readonly themeModeButton: Locator;
    readonly languageTypeButton: Locator;
    readonly walletLink: Locator;
    readonly logoutLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.profileMenuContent = page.locator('[data-testid="user-profile-menu-content"]');
        this.profileUserName = page.locator('[data-testid="user-name-in-profile-menu"]');
        this.profileLink = '[data-testid="user-profile-menu-profile-link"]'
        this.notificationsLink = page.locator('[data-testid="user-profile-menu-notifications-link"]');
        this.commentsLink = page.locator('[data-testid="user-profile-menu-comments-link"]');
        this.repliesLink = page.locator('[data-testid="user-profile-menu-replies-link"]');
        this.themeModeButton = page.locator('[data-testid="theme-mode"]');
        this.languageTypeButton = page.locator('[data-testid="toggle-language"]');
        this.walletLink = page.locator('[data-testid="user-profile-menu-wallet-link"]');
        this.logoutLink = page.locator('[data-testid="user-profile-menu-logout-link"]');
    }

    async validateUserProfileManuIsOpen() {
        await expect(this.profileMenuContent).toBeVisible();
    }

    async validateUserNameInProfileMenu(username: string){
        await expect(this.profileUserName).toHaveText(username);
    }
}
