import { Locator, Page, expect } from '@playwright/test';

export class PrivacyPolicyPage {
  readonly page: Page;
  readonly subtitles: Locator;
  readonly firstSubtitle: Locator;
  readonly mainElement: Locator;
  readonly mainHeading: Locator;
  readonly firstParagraf: Locator;
  readonly navPostLink: Locator;
  readonly navProposalsLink: Locator;
  readonly navWitnessesLink: Locator;
  readonly navOurDappsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subtitles = this.page.locator('h3[class="mb-4 text-3xl"]');
    this.firstSubtitle = this.subtitles.first();
    this.mainElement = this.page.locator('.mb-4.max-w-2xl.text-sm.font-light');
    this.mainHeading = this.page.getByRole('heading', { name: 'Privacy Policy', level: 1 });
    this.firstParagraf = this.page.getByText('This Privacy Policy describes');
    this.navPostLink = this.page.locator('[data-testid="nav-posts-link"]');
    this.navProposalsLink = this.page.locator('[data-testid="nav-proposals-link"]');
    this.navWitnessesLink = this.page.locator('[data-testid="nav-witnesses-link"]');
    this.navOurDappsLink = this.page.locator('[data-testid="nav-our-dapps-link"]');
  }

  async goto() {
    await this.page.goto('/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(this.mainElement).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const propertyValue = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return propertyValue;
  }
}
