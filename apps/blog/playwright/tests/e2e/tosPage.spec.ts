import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { TOSPage } from '../support/pages/tosPage';

test.describe('Terms of Service page tests', () => {
  let homePage: HomePage;
  let tosPage: TOSPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    tosPage = new TOSPage(page);
  });

  test('move to the Terms of Service page from the Home page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTermsOfServicePage();
  });

  test('validate amount of subtitles in the Terms of Service', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTermsOfServicePage();

    const subtitlesAmount = await (await tosPage.subtitles.all()).length;
    expect(subtitlesAmount).toBe(25);
  });

  test('validate styles in the Terms of Service in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTermsOfServicePage();

    // Validate subtitle styles of the Terms of Service page
    const subtitleColor = await tosPage.getElementCssPropertyValue(
      tosPage.firstSubtitle,
      'color'
    );
    expect(subtitleColor).toBe('rgb(24, 30, 42)');

    const subtitleFontSize = await tosPage.getElementCssPropertyValue(
      tosPage.firstSubtitle,
      'font-size'
    );
    expect(subtitleFontSize).toBe('24px');

    const backgroundColorPage = await tosPage.getElementCssPropertyValue(
      tosPage.mainElement,
      'background-color'
    );
    expect(backgroundColorPage).toBe('rgba(0, 0, 0, 0)');

    const paragrafColor = await tosPage.getElementCssPropertyValue(
      tosPage.paragrafText,
      'color'
    );
    expect(paragrafColor).toBe('rgb(24, 30, 42)');

    const paragrafFontSize = await tosPage.getElementCssPropertyValue(
      tosPage.paragrafText,
      'font-size'
    );
    expect(paragrafFontSize).toContain('16px');
  });

  test('validate styles in the Terms of Service in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToTermsOfServicePage();
    // move to the dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Validate subtitle styles of the terms of service page
    const subtitleColor = await tosPage.getElementCssPropertyValue(
      tosPage.firstSubtitle,
      'color'
    );
    expect(subtitleColor).toBe('rgb(248, 250, 252)');

    const subtitleFontSize = await tosPage.getElementCssPropertyValue(
      tosPage.firstSubtitle,
      'font-size'
    );
    expect(subtitleFontSize).toBe('24px');

    const backgroundColorPage = await tosPage.getElementCssPropertyValue(
      tosPage.mainElement,
      'background-color'
    );
    expect(backgroundColorPage).toBe('rgba(0, 0, 0, 0)');

    const paragrafColor = await tosPage.getElementCssPropertyValue(
      tosPage.paragrafText,
      'color'
    );
    expect(paragrafColor).toBe('rgb(248, 250, 252)');

    const paragrafFontSize = await tosPage.getElementCssPropertyValue(
      tosPage.paragrafText,
      'font-size'
    );
    expect(paragrafFontSize).toContain('16px');
  });

  test('validate text of header menu on the Terms of Service page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToPrivacyPolicyPage();

    await expect(tosPage.navPostLink).toHaveText('Posts');
    await expect(tosPage.navProposalsLink).toHaveText('Proposals');
    await expect(tosPage.navWitnessesLink).toHaveText('Witnesses');
    await expect(tosPage.navOurDappsLink).toHaveText('Our dApps');
  });
});
