import { Locator, Page, expect } from '@playwright/test';

export class TOSPage {
  readonly page: Page;
  readonly subtitles: Locator;
  readonly firstSubtitle: Locator;
  readonly mainElement: Locator;
  readonly paragrafText: Locator;
  readonly navPostLink: Locator;
  readonly navProposalsLink: Locator;
  readonly navWitnessesLink: Locator;
  readonly navOurDappsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subtitles = page.locator('[id="articleBody"] h2');
    this.firstSubtitle = this.subtitles.first();
    this.mainElement = page.locator('div[class="flex-1 bg-slate-50 dark:bg-background/95"]');
    this.paragrafText = page.getByText('If we decide to make changes to this Agreement');
    this.navPostLink = this.page.locator('[data-testid="nav-posts-link"]');
    this.navProposalsLink = this.page.locator('[data-testid="nav-proposals-link"]');
    this.navWitnessesLink = this.page.locator('[data-testid="nav-witnesses-link"]');
    this.navOurDappsLink = this.page.locator('[data-testid="nav-our-dapps-link"]');
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const propertyValue = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return propertyValue;
  }
}
