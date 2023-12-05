import { Locator, Page, expect } from '@playwright/test';

export class WelcomePage {
  readonly page: Page;
  readonly subtitles: Locator;
  readonly faqLink: Locator;
  readonly hiveWhitepaperLink: Locator;
  readonly appsBuiltOnHiveLink: Locator;
  readonly hiveBlockExplorerLink: Locator;
  readonly openHiveChatLink: Locator;
  readonly openHiveChatHelpLink: Locator;
  readonly hiveDiscordLink: Locator;
  readonly hiveTelegramLink: Locator;
  readonly hiveKeychainLink: Locator;
  readonly hiveSignerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subtitles = this.page.locator('[id="articleBody"] h3');
    this.faqLink = this.page.getByRole('link', {name: 'FAQ'});
    this.hiveWhitepaperLink = this.page.getByRole('link', {name: 'Hive Whitepaper'});
    this.appsBuiltOnHiveLink = this.page.getByRole('link', {name: 'Apps Built on Hive'});
    this.hiveBlockExplorerLink = this.page.getByRole('link', {name: 'Hive Block Explorer'});
    this.openHiveChatLink = this.page.getByRole('link', {name: 'OpenHive.Chat'});
    this.openHiveChatHelpLink = this.page.getByRole('link', {name: '#help'});
    this.hiveDiscordLink = this.page.getByRole('link', {name: 'Discord'});
    this.hiveTelegramLink = this.page.getByRole('link', {name: 'Telegram'});
    this.hiveKeychainLink = this.page.getByRole('link', {name: 'Hive Keychain'});
    this.hiveSignerLink = this.page.getByRole('link', {name: 'Hivesigner'});
  }
}
