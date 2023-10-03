import { Locator, Page, expect } from "@playwright/test"

export class CommunitiesPage{
    readonly page: Page
    readonly searchInput: Locator
    readonly combobox: Locator
    readonly comboboxDefaultValue: Locator
    readonly firstCommunityDefault: Locator

    constructor(page:Page){
        this.page = page
        this.searchInput = page.locator('#search')
        this.combobox = page.locator('button[role="combobox"]')
        this.comboboxDefaultValue = page.locator('button[role="combobox"] span')
        this.firstCommunityDefault = page.locator('div ul div div div h3').first()
    }

    async validataExplorerCommunitiesPageIsLoaded(){
        await expect(this.searchInput).toBeVisible()
        await expect(this.combobox).toBeVisible()
        await expect(this.comboboxDefaultValue).toHaveText('Rank')
        await expect(this.firstCommunityDefault).toHaveText('LeoFinance');
    }
}
