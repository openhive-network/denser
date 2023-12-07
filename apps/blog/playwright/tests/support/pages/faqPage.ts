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

  constructor(page: Page) {
    this.page = page;
    this.subTopicsOfContent = this.page.locator('[id="articleBody"] h3 span');
    this.firstSubTopicOfContent = this.subTopicsOfContent.first();
    this.subTopicsOfContentDescription = this.page.locator('[id="articleBody"] ul + h1, [id="articleBody"] p + h1');
    this.firstSubTopicsOfContentDescription = this.subTopicsOfContentDescription.first();
    this.whatIsHiveBlogLink = this.page.getByRole('link', {name: 'What is Hive.blog?'});
    this.whatIsHiveBlogContentHeader = this.page.getByRole('heading', {name: 'What is hive.blog?'});
    this.whatIsHiveBlogContentDescription = this.page.locator('[id="articleBody"] h2 + p').first();
    this.mainTitle = this.page.locator('[id="articleBody"] h1').first();
    this.isThereGithubPageForHiveBlogLink = this.page.getByRole('link', {name: 'Is there a Github page for Hive.blog?'});
    this.firstCaretSign = this.page.locator('[href="#Table_of_Contents_General"]').first();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const propertyValue = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return propertyValue;
  }
}
