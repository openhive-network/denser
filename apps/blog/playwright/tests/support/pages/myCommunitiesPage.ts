import { Locator, Page, expect } from '@playwright/test';

export class MyCommunitiesPage {
    readonly page: Page;
    readonly myCommunitiesLink: Locator;
    readonly myCommunitiesHeader: Locator;
    readonly postListItems: Locator;
    readonly firstPostListItem: Locator;

    constructor(page: Page) {
        this.page = page;
        this.myCommunitiesHeader = page.locator('span.text-md:text("My communities")');
        this.myCommunitiesLink = page.getByTestId('card-trending-comunities').getByText('My communities');
        this.postListItems = page.getByTestId('post-list-item');
        this.firstPostListItem = this.postListItems.first();

    }

    // Validate default state of my communities page
    async validateMyCommunitiesPage() {
        await this.page.waitForURL('**\/my');
        expect(this.page.url()).toContain(`/my`);
        await this.page.waitForSelector(this.firstPostListItem['_selector']);
        await this.page.waitForTimeout(3000);
        expect(await this.postListItems.count()).toBeGreaterThan(0);
        await expect(this.myCommunitiesHeader).toBeVisible();
    }
}
