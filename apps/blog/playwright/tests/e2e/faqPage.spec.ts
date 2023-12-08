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

  test('move to the "Can I earn digital tokens on Hive? How?" description and come back', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();

    await faqPage.canIEarnDigitalTokensOnHiveLink.click();
    await faqPage.page.waitForTimeout(1000);
    await expect(faqPage.page).toHaveScreenshot('canIEarnDigitalTokensOnHiveDescription.png');
    await faqPage.caretSignCanIEarnDigitalTokensOnHiveLink.click();
    await faqPage.page.waitForTimeout(1000);
    await expect(faqPage.page).toHaveScreenshot('canIEarnDigitalTokensOnHiveComeBack.png');
  });

  test('validate styles of faq page titles and links part in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();

    // Validate main title styles of the FAQ page
    const faqPageTitleColor = await faqPage.getElementCssPropertyValue(faqPage.mainTitle, "color");
    expect(await faqPageTitleColor).toBe('rgb(17, 24, 39)');
    const faqPageTitleFontWeight = await faqPage.getElementCssPropertyValue(faqPage.mainTitle, "font-weight");
    expect(await faqPageTitleFontWeight).toBe('800');
    // Validate styles of the first subtopic
    const faqPageFirstSubTopicOfContentColor = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicOfContent, "color");
    expect(await faqPageFirstSubTopicOfContentColor).toBe('rgb(17, 24, 39)');
    const faqPageFirstSubTopicOfContentFontWeight = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicOfContent, "font-weight");
    expect(await faqPageFirstSubTopicOfContentFontWeight).toBe('600');
    // Validate styles of the first link in the General subtopic
    const faqPageFirstLinkOfFirstSubtopicColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogLink, "color");
    expect(await faqPageFirstLinkOfFirstSubtopicColor).toBe('rgb(220, 38, 38)');
    const faqPageFirstLinkOfFirstSubtopicFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogLink, "font-weight");
    expect(await faqPageFirstLinkOfFirstSubtopicFontWeight).toBe('400');
    // Validate styles of the 'Is there a Github page for Hive.blog?'
    const faqPageIsThereGithubPageForHiveBlogLinkColor = await faqPage.getElementCssPropertyValue(faqPage.isThereGithubPageForHiveBlogLink, "color");
    expect(await faqPageIsThereGithubPageForHiveBlogLinkColor).toBe('rgb(220, 38, 38)');
    const faqPageIsThereGithubPageForHiveBlogLinkFontWeight = await faqPage.getElementCssPropertyValue(faqPage.isThereGithubPageForHiveBlogLink, "font-weight");
    expect(await faqPageIsThereGithubPageForHiveBlogLinkFontWeight).toBe('400');
  });

  test('validate styles of faq page titles and links part in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Validate main title styles of the FAQ page
    const faqPageTitleColor = await faqPage.getElementCssPropertyValue(faqPage.mainTitle, "color");
    expect(await faqPageTitleColor).toBe('rgb(255, 255, 255)');
    const faqPageTitleFontWeight = await faqPage.getElementCssPropertyValue(faqPage.mainTitle, "font-weight");
    expect(await faqPageTitleFontWeight).toBe('800');
    // Validate styles of the first subtopic
    const faqPageFirstSubTopicOfContentColor = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicOfContent, "color");
    expect(await faqPageFirstSubTopicOfContentColor).toBe('rgb(255, 255, 255)');
    const faqPageFirstSubTopicOfContentFontWeight = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicOfContent, "font-weight");
    expect(await faqPageFirstSubTopicOfContentFontWeight).toBe('600');
    // Validate styles of the first link in the General subtopic
    const faqPageFirstLinkOfFirstSubtopicColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogLink, "color");
    expect(await faqPageFirstLinkOfFirstSubtopicColor).toBe('rgb(220, 38, 38)');
    const faqPageFirstLinkOfFirstSubtopicFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogLink, "font-weight");
    expect(await faqPageFirstLinkOfFirstSubtopicFontWeight).toBe('400');
    // Validate styles of the 'Is there a Github page for Hive.blog?'
    const faqPageIsThereGithubPageForHiveBlogLinkColor = await faqPage.getElementCssPropertyValue(faqPage.isThereGithubPageForHiveBlogLink, "color");
    expect(await faqPageIsThereGithubPageForHiveBlogLinkColor).toBe('rgb(220, 38, 38)');
    const faqPageIsThereGithubPageForHiveBlogLinkFontWeight = await faqPage.getElementCssPropertyValue(faqPage.isThereGithubPageForHiveBlogLink, "font-weight");
    expect(await faqPageIsThereGithubPageForHiveBlogLinkFontWeight).toBe('400');
  });

  test('validate styles of the elements with content in faq page in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Validate styles of the subtitle of content article in the FAQ page
    const firstSubTopicsOfContentDescriptionColor = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicsOfContentDescription, "color");
    expect(await firstSubTopicsOfContentDescriptionColor).toBe('rgb(255, 255, 255)');
    const firstSubTopicsOfContentDescriptionFontWeight = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicsOfContentDescription, "font-weight");
    expect(await firstSubTopicsOfContentDescriptionFontWeight).toBe('800');
    // Validate styles of the 'What is hive.blog?' title of content article
    const whatIsHiveBlogContentHeaderColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentHeader, "color");
    expect(await whatIsHiveBlogContentHeaderColor).toBe('rgb(255, 255, 255)');
    const whatIsHiveBlogContentHeaderFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentHeader, "font-weight");
    expect(await whatIsHiveBlogContentHeaderFontWeight).toBe('700');
    // Validate styles of the 'What is hive.blog?' content article (description)
    const whatIsHiveBlogContentDescriptionColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentDescription, "color");
    expect(await whatIsHiveBlogContentDescriptionColor).toBe('rgb(209, 213, 219)');
    const whatIsHiveBlogContentDescriptionFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentDescription, "font-weight");
    expect(await whatIsHiveBlogContentDescriptionFontWeight).toBe('400');
    // Validate styles of the first caret sign
    const firstCaretSignColor = await faqPage.getElementCssPropertyValue(faqPage.firstCaretSign, "color");
    expect(await firstCaretSignColor).toBe('rgb(220, 38, 38)');
  });

  test('validate styles of the elements with content in faq page in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToFaqPage();

    // Validate styles of the subtitle of content article in the FAQ page
    const firstSubTopicsOfContentDescriptionColor = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicsOfContentDescription, "color");
    expect(await firstSubTopicsOfContentDescriptionColor).toBe('rgb(17, 24, 39)');
    const firstSubTopicsOfContentDescriptionFontWeight = await faqPage.getElementCssPropertyValue(faqPage.firstSubTopicsOfContentDescription, "font-weight");
    expect(await firstSubTopicsOfContentDescriptionFontWeight).toBe('800');
    // Validate styles of the 'What is hive.blog?' title of content article
    const whatIsHiveBlogContentHeaderColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentHeader, "color");
    expect(await whatIsHiveBlogContentHeaderColor).toBe('rgb(17, 24, 39)');
    const whatIsHiveBlogContentHeaderFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentHeader, "font-weight");
    expect(await whatIsHiveBlogContentHeaderFontWeight).toBe('700');
    // Validate styles of the 'What is hive.blog?' content article (description)
    const whatIsHiveBlogContentDescriptionColor = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentDescription, "color");
    expect(await whatIsHiveBlogContentDescriptionColor).toBe('rgb(55, 65, 81)');
    const whatIsHiveBlogContentDescriptionFontWeight = await faqPage.getElementCssPropertyValue(faqPage.whatIsHiveBlogContentDescription, "font-weight");
    expect(await whatIsHiveBlogContentDescriptionFontWeight).toBe('400');
    // Validate styles of the first caret sign
    const firstCaretSignColor = await faqPage.getElementCssPropertyValue(faqPage.firstCaretSign, "color");
    expect(await firstCaretSignColor).toBe('rgb(220, 38, 38)');
  });
});
