import { Locator, Page, expect } from "@playwright/test"

export class CommunitiesPage{
    readonly page: Page
    readonly searchInput: Locator
    readonly combobox: Locator
    readonly comboboxDefaultValue: Locator
    readonly createComunityButton: Locator
    readonly firstCommunityDefault: Locator

    constructor(page:Page){
        this.page = page
        this.searchInput = page.locator('#search')
        this.combobox = page.locator('button[role="combobox"]')
        this.comboboxDefaultValue = page.locator('button[role="combobox"] span')
        this.createComunityButton = page.locator('[class="mt-4 flex items-center justify-between"] a:text("Create a Community")')
        this.firstCommunityDefault = page.locator('div ul div div div h3').first()
    }

    async validataCommunitiesPageIsLoaded(){
        await expect(this.searchInput).toBeVisible()
        await expect(this.combobox).toBeVisible()
        await expect(this.comboboxDefaultValue).toHaveText('Rank')
        await expect(this.createComunityButton).toBeVisible()
        await expect(this.firstCommunityDefault).toHaveText('LeoFinance');
    }
}
