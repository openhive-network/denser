import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { FaqPage } from '../support/pages/faqPage';

test.describe('Welcome page tests', () => {
  let homePage: HomePage;
  let faqPage: FaqPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    faqPage = new FaqPage(page);
  });

  test('move to the FAQ page from the Home page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();
  });

  test('validate amount of contents topics', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();

    const numberOfTopics: number = 17;
    const topics = await faqPage.subTopicsOfContent.all();
    const topicsLength = await topics.length;

    expect(topicsLength).toBe(numberOfTopics);
  });

  test('validate amount of description contents topics', async ({ page }) => {
    // Validate the amount of the main topics of descriptions
    await homePage.goto();
    await homePage.moveToFaqPage();

    const numberOfTopics: number = 18; // 17 main topics and + 1 main title (Hive.blog FAQ)
    const topics = await faqPage.subTopicsOfContentDescription.all();
    const topicsLength = await topics.length;

    expect(topicsLength).toBe(numberOfTopics);
  });

  test('move to the "What is Hive.blog?" description', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();

    await faqPage.whatIsHiveBlogLink.click();
    await faqPage.page.waitForTimeout(1000);
    await expect(faqPage.page).toHaveScreenshot('whatishiveblog.png');
  });

});
