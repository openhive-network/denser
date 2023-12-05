import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { WelcomePage } from '../support/pages/welcomePage';

test.describe('Welcome page tests', () => {
  let homePage: HomePage;
  let welcomePage: WelcomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    welcomePage = new WelcomePage(page);
  });

  test('move to the Welcome page from the Home page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToWelcomePage();
  });

  test('validate number of subtitles in the welcome page', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToWelcomePage();

    const subtitles = await welcomePage.subtitles.all();
    const amountOfSubtitles = await subtitles.length;

    // expected subtitles is 8
    expect(amountOfSubtitles).toBe(8);
  });

  test('validate title of subtitles in the welcome page', async ({ page }) => {
    const expectedSubtitles: string[] = [
      '1. Backup your password',
      '2. Obtain and backup your keys',
      '3. Some ground rules',
      '4. Update your profile',
      '5. Create your "Introduceyourself" Post',
      '6. Equip yourself',
      '7. Get to know others',
      '8. Voting and Tokens'
    ];

    await homePage.goto();
    await homePage.moveToWelcomePage();

    const subtitles = await welcomePage.subtitles.all();

    for (let subTitleIndex in expectedSubtitles) {
      await expect(subtitles[subTitleIndex]).toHaveText(expectedSubtitles[subTitleIndex]);
    }
  });
});
