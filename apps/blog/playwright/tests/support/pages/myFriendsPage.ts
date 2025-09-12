import { Locator, Page, expect } from '@playwright/test';

export class MyFriendsPage {
    readonly page: Page;
    readonly myFriendsLink: Locator;
    readonly youHaveNotFollowedAnyoneYetMessage: Locator;
    readonly exploreTrendingLink: Locator;
    readonly newUsersGuideLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.myFriendsLink = page.getByTestId('card-trending-comunities').getByText('My friends');
        this.youHaveNotFollowedAnyoneYetMessage = page.getByTestId('user-has-not-started-blogging-yet').getByText("You haven't followed anyone yet!");
        this.exploreTrendingLink = page.getByText('Explore Trending');
        this.newUsersGuideLink = page.getByText('New users guide');
    }

    // Validate default state of my friends ("You haven't followed anyone yet!")
    async validateMyFriendsPage() {
        await this.page.waitForURL('**\/feed');
        expect(this.page.url()).toContain(`/feed`);
        await expect(this.youHaveNotFollowedAnyoneYetMessage).toBeVisible();
        await expect(this.exploreTrendingLink).toBeVisible();
        await expect(this.newUsersGuideLink).toBeVisible();
    }
}
