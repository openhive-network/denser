import { Locator, Page, expect } from "@playwright/test"

export class HomePage {
  readonly page: Page
  readonly getTrandingCommunitiesHeader: Locator
  readonly getExploreCommunities: Locator
  readonly getLeoFinanceCommunitiesLink: Locator
  readonly getHeaderLeoCommunities: Locator
  readonly getPinmappleCommunitiesLink: Locator
  readonly getHeaderPinmappleCommunities: Locator
  readonly getHomeNavLink: Locator
  readonly getHeaderAllCommunities: Locator
  readonly getMainTimeLineOfPosts: any
  readonly getFirstPostAuthor: Locator
  readonly getFirstPostAuthorReputation: Locator
  readonly getFirstPostTitle: Locator
  readonly getFirstPostPayout: Locator
  readonly getFirstPostVotes: Locator
  readonly getFirstPostChildren: Locator
  readonly getBody: Locator
  readonly getThemeModeButton: Locator
  readonly getThemeModeItem: Locator
  readonly getFilterPosts: Locator
  readonly getFilterPostsList: Locator

  constructor(page: Page) {
    this.page = page
    this.getTrandingCommunitiesHeader = page.getByText("Trending Communities")
    this.getExploreCommunities = page.getByText("Explore communities...")
    this.getLeoFinanceCommunitiesLink = page
      .locator("a")
      .getByRole("button", { name: "LeoFinance" })
    this.getHeaderLeoCommunities = page.locator('[class="mt-4 flex items-center justify-between"] span:text("LeoFinance")')
    this.getPinmappleCommunitiesLink = page.locator(
      'a > button:text("Pinmapple")'
    )
    this.getHeaderPinmappleCommunities = page.locator('[class="mt-4 flex items-center justify-between"] span:text("Pinmapple")')
    this.getHomeNavLink = page.locator('header a span:text("Hive Blog")')
    this.getHeaderAllCommunities = page.locator('[class="mt-4 flex items-center justify-between"] span:text("All posts")')
    this.getMainTimeLineOfPosts = page.locator('li[data-testid="post-list-item"]')
    this.getFirstPostAuthor = page
      .locator('[data-testid="post-author"]')
      .first()
    this.getFirstPostAuthorReputation = this.getFirstPostAuthor.locator('..')
    this.getFirstPostTitle = page.locator('li[data-testid="post-list-item"] h3 a').first()
    this.getFirstPostPayout = page.locator('[data-testid="post-payout"]').first()
    this.getFirstPostVotes = page.locator('[data-testid="post-total-votes"]').first()
    this.getFirstPostChildren = page.locator('[data-testid="post-children"]').first()
    this.getBody = page.locator("body")
    this.getThemeModeButton = page.locator('[data-testid="theme-mode"]')
    this.getThemeModeItem = page.locator('[data-testid="theme-mode-item"]')
    this.getFilterPosts = page.locator('[data-testid="posts-filter"]')
    this.getFilterPostsList = page.locator('[data-testid="posts-filter-list"]')
  }

  async goto() {
    await this.page.goto("/")
    await this.page.waitForLoadState("networkidle")
    await this.page.waitForSelector(this.getMainTimeLineOfPosts["_selector"])
  }

  async moveToHomePage() {
    await this.getHomeNavLink.click()
    await expect(this.getHeaderAllCommunities).toBeVisible()
  }

  async moveToLeoFinanceCommunities() {
    await this.getLeoFinanceCommunitiesLink.click()
    await expect(this.getHeaderLeoCommunities).toBeVisible()
  }

  async moveToPinmappleCommunities() {
    await this.getPinmappleCommunitiesLink.click()
    await expect(this.getHeaderPinmappleCommunities).toBeVisible()
  }

  async moveToExploreCommunities() {
    await this.getExploreCommunities.click()
  }

  async moveToFirstPostAuthorProfilePage() {
    const firstPostAuthorNick = await this.getFirstPostAuthor.innerText()
    await this.getFirstPostAuthor.click()

    // Validate that you moved to the clicked post author profile page
    const postAuthorNickOnProfilePage = await this.page.locator(
      '[data-testid="profile-nickname"]'
    )
    await expect(firstPostAuthorNick).toMatch(
      await postAuthorNickOnProfilePage.innerText()
    )
  }

  async isTrendingCommunitiesVisible() {
    await expect(this.getTrandingCommunitiesHeader).toBeVisible()
    await expect(this.getExploreCommunities).toHaveText(
      /Explore communities.../
    )
    await expect(this.getExploreCommunities).toBeEnabled()
  }

  async mainPostsTimelineVisible() {
    // Validate that there are 20 posts displayed on HomePage as default (without scrolldown)
    await expect(this.getMainTimeLineOfPosts).toHaveCount(20)
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css)
    }, cssProperty)
    // return value of element's css property
    return bcg
  }

  // Theme mode: Light, Dark, System
  async changeThemeMode(thememode: string) {
    await this.getThemeModeButton.click()
    await this.getThemeModeItem.locator(`span:text(\"${thememode}\")`).click()
  }

  async validateThemeModeIsLight() {
    expect(
      await this.getElementCssPropertyValue(this.getBody, "background-color")
    ).toBe("rgb(255, 255, 255)")
  }

  async validateThemeModeIsSystem() {
    expect(
      await this.getElementCssPropertyValue(this.getBody, "background-color")
    ).toBe("rgb(255, 255, 255)")
  }

  async validateThemeModeIsDark() {
    expect(
      await this.getElementCssPropertyValue(this.getBody, "background-color")
    ).toBe("rgb(3, 7, 17)")
  }
}
