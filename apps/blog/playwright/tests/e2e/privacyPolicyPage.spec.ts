import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PrivacyPolicyPage } from '../support/pages/privacyPolicyPage';

test.describe('Privacy Policy page tests', () => {
  let homePage: HomePage;
  let privacyPolicyPage: PrivacyPolicyPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    privacyPolicyPage = new PrivacyPolicyPage(page);
  });

  test('move to the Privacy Policy page from the Home page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();
  });

  test('validate amount of subtitles in the Privacy Policy', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();

    const subtitlesAmount = await (await privacyPolicyPage.subtitles.all()).length;
    expect(subtitlesAmount).toBe(11);
  });

  test('validate styles in the Privacy Policy in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();

    // Validate subtitle styles of the privacy policy page
    const subtitleColor = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstSubtitle,
      'color'
    );
    expect(subtitleColor).toBe('rgb(15, 23, 42)');
    const subtitleFontSize = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstSubtitle,
      'font-size'
    );
    expect(subtitleFontSize).toBe('30px');
    const backgroundColorPage = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.mainElement,
      'background-color'
    );
    expect(backgroundColorPage).toBe('rgb(248, 250, 252)');
    const paragrafColor = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstParagraf,
      'color'
    );
    expect(paragrafColor).toBe('rgb(15, 23, 42)');
    const paragrafFontSize = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstParagraf,
      'font-size'
    );
    expect(paragrafFontSize).toBe('14px');
  });

  test('validate styles in the Privacy Policy in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Validate subtitle styles of the privacy policy page
    const subtitleColor = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstSubtitle,
      'color'
    );
    expect(subtitleColor).toBe('rgb(225, 231, 239)');
    const subtitleFontSize = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstSubtitle,
      'font-size'
    );
    expect(subtitleFontSize).toBe('30px');
    const backgroundColorPage = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.mainElement,
      'background-color'
    );
    expect(backgroundColorPage).toBe('rgba(3, 7, 17, 0.95)');
    const paragrafColor = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstParagraf,
      'color'
    );
    expect(paragrafColor).toBe('rgb(225, 231, 239)');
    const paragrafFontSize = await privacyPolicyPage.getElementCssPropertyValue(
      privacyPolicyPage.firstParagraf,
      'font-size'
    );
    expect(paragrafFontSize).toBe('14px');
  });

  test('validate text of header menu on the Privacy Policy page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();

    await expect(privacyPolicyPage.navPostLink).toHaveText('Posts');
    await expect(privacyPolicyPage.navProposalsLink).toHaveText('Proposals');
    await expect(privacyPolicyPage.navWitnessesLink).toHaveText('Witnesses');
    await expect(privacyPolicyPage.navOurDappsLink).toHaveText('Our dApps');
  });
});
