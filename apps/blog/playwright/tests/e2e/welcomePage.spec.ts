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

  test('move to the Welcome page from the Home page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    await homePage.goto();
    await homePage.moveToWelcomePage();
  });

  test('validate number of subtitles in the welcome page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    await homePage.goto();
    await homePage.moveToWelcomePage();

    const subtitles = await welcomePage.subtitles.all();
    const amountOfSubtitles = await subtitles.length;

    // expected subtitles is 8
    expect(amountOfSubtitles).toBe(8);
  });

  test('validate title of subtitles in the welcome page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
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

  test('validate additional resources in the welcome page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    const faqUrl: string = 'https://hive.blog/faq.html';
    const whitepaperUrl: string = 'https://hive.io/whitepaper.pdf';
    const appsBuiltOnHiveUrl: string = 'https://hiveprojects.io/';
    const blockExplorerUrl: string = 'https://hiveblocks.com/';

    await homePage.goto();
    await homePage.moveToWelcomePage();

    await expect(welcomePage.faqLink).toHaveAttribute('href', faqUrl);
    await expect(welcomePage.hiveWhitepaperLink).toHaveAttribute('href', whitepaperUrl);
    await expect(welcomePage.appsBuiltOnHiveLink).toHaveAttribute('href', appsBuiltOnHiveUrl);
    await expect(welcomePage.hiveBlockExplorerLink).toHaveAttribute('href', blockExplorerUrl);
  });

  test('validate links of get to know others subtitle in the welcome page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    const openHiveChatUrl: string = 'https://openhive.chat/';
    const openHiveChatHelpUrl: string = 'https://openhive.chat/channel/help';
    const hiveDiscordUrl: string = 'https://myhive.li/discord';
    const hiveTelegramUrl: string = 'https://t.me/hiveblockchain';

    await homePage.goto();
    await homePage.moveToWelcomePage();

    await expect(welcomePage.openHiveChatLink).toHaveAttribute('href', openHiveChatUrl);
    await expect(welcomePage.openHiveChatHelpLink).toHaveAttribute('href', openHiveChatHelpUrl);
    await expect(welcomePage.hiveDiscordLink).toHaveAttribute('href', hiveDiscordUrl);
    await expect(welcomePage.hiveTelegramLink).toHaveAttribute('href', hiveTelegramUrl);
  });

  test('validate links of equip yourself subtitle in the welcome page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    const hiveKeychainUrl: string = 'https://hive-keychain.com';
    const hiveSignerUrl: string = 'https://hivesigner.com';

    await homePage.goto();
    await homePage.moveToWelcomePage();

    await expect(welcomePage.hiveKeychainLink).toHaveAttribute('href', hiveKeychainUrl);
    await expect(welcomePage.hiveSignerLink).toHaveAttribute('href', hiveSignerUrl);
  });
});
