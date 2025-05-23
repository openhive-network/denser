import { Locator, Page, expect } from "@playwright/test";
import { ApiHelper } from '../apiHelper';

export class CommunitiesExplorePage{
    readonly page: Page;
    readonly searchInput: Locator;
    readonly combobox: Locator;
    readonly comboboxDefaultValue: Locator;
    readonly firstCommunityDefault: Locator;
    readonly communitiesFilter: Locator;
    readonly communitiesFilterItems: Locator;
    readonly communityListItem: Locator;
    readonly communityListItemTitle: Locator;
    readonly communityListItemAbout: Locator;
    readonly communityListItemFooter: Locator;
    readonly communityListItemSubscribeButton: Locator;
    readonly noResultsForYourSearch: Locator;
    readonly communitiesHeaderPage: Locator;
    readonly communitiesHeaderTitle: Locator;

    constructor(page:Page){
        this.page = page;
        this.searchInput = page.locator('#search');
        this.combobox = page.locator('button[role="combobox"]');
        this.comboboxDefaultValue = page.locator('button[role="combobox"] span');
        this.communitiesFilter = page.locator('[data-testid="communities-filter"]');
        this.communitiesFilterItems = page.locator('[data-testid="communities-filter-item"]');
        this.firstCommunityDefault = page.locator('div ul div div div h3').first();

        this.communityListItem = page.locator('[data-testid="community-list-item"]');
        this.communityListItemTitle = page.locator('[data-testid="community-list-item-title"]');
        this.communityListItemAbout = page.locator('[data-testid="community-list-item-about"]');
        this.communityListItemFooter = page.locator('[data-testid="community-list-item-footer"]');
        this.communityListItemSubscribeButton = page.locator('[data-testid="community-subscribe-button"]');
        this.noResultsForYourSearch = page.locator('[data-testid="communities-search-no-results-msg"]');
        this.communitiesHeaderPage = page.locator('[data-testid="communities-header"]');
        this.communitiesHeaderTitle = page.locator('[data-testid="communities-header-title"]');
    }

    async validataExplorerCommunitiesPageIsLoaded(){
        await expect(this.searchInput).toBeVisible();
        await expect(this.combobox).toBeVisible();
        await expect(this.comboboxDefaultValue).toHaveText('Rank');

        const apiHelper = await new ApiHelper(this.page);
        const firstCommunity = await apiHelper.getListCommunitiesAPI();
        const firstCommunityTitle = await firstCommunity.result[0].title;
        await expect(this.firstCommunityDefault).toHaveText(firstCommunityTitle);
    }

    async getElementCssPropertyValue(element: Locator, cssProperty: string) {
        const bcg = await element.evaluate((ele, css) => {
          return window.getComputedStyle(ele).getPropertyValue(css);
        }, cssProperty);
        // return value of element's css property
        return bcg;
    }
}
