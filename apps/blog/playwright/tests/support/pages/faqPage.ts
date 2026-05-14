import { Locator, Page, expect } from '@playwright/test';

export class FaqPage {
  readonly page: Page;
  readonly subTopicsOfContent: Locator;
  readonly firstSubTopicOfContent: Locator;
  readonly subTopicsOfContentDescription: Locator;
  readonly firstSubTopicsOfContentDescription: Locator;
  readonly whatIsHiveBlogLink: Locator;
  readonly whatIsHiveBlogContentHeader: Locator;
  readonly whatIsHiveBlogContentDescription: Locator;
  readonly mainTitle: Locator;
  readonly isThereGithubPageForHiveBlogLink: Locator;
  readonly firstCaretSign: Locator;
  readonly canIEarnDigitalTokensOnHiveLink: Locator;
  readonly caretSignCanIEarnDigitalTokensOnHiveLink: Locator;

  readonly articleBody: Locator;

  constructor(page: Page) {
    this.page = page;
    this.articleBody = this.page.locator('[id="articleBody"]');
    this.subTopicsOfContent = this.articleBody.locator('h3 span');
    this.firstSubTopicOfContent = this.subTopicsOfContent.first();
    this.subTopicsOfContentDescription = this.articleBody.locator('ul + h1, p + h1');
    this.firstSubTopicsOfContentDescription = this.subTopicsOfContentDescription.first();
    this.whatIsHiveBlogLink = this.page.getByRole('link', {name: 'What is Hive.blog?'});
    this.whatIsHiveBlogContentHeader = this.page.getByRole('heading', {name: 'What is hive.blog?'});
    this.whatIsHiveBlogContentDescription = this.articleBody.locator('h2 + p').first();
    this.mainTitle = this.articleBody.locator('h1').first();
    this.isThereGithubPageForHiveBlogLink = this.page.getByRole('link', {name: 'Is there a Github page for Hive.blog?'});
    this.firstCaretSign = this.page.locator('[href="#Table_of_Contents_General"]').first();
    this.canIEarnDigitalTokensOnHiveLink = this.page.getByRole('link', {name: 'Can I earn digital tokens on Hive? How?'});
    this.caretSignCanIEarnDigitalTokensOnHiveLink = this.page.locator('p:nth-child(63) > a');
  }

  async goto() {
    await this.page.goto('/faq.html', { waitUntil: 'domcontentloaded' });
    await expect(this.articleBody).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const propertyValue = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return propertyValue;
  }
}
