import { test, expect } from '../support/fixture-proxy-test';

/**
 * The FAQ's "Decentralized Hive Fund and Proposals" section, which the wallet's proposals page links to.
 *
 * The FAQ is static markdown; only the site header reads chain data, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const FAQ_PATH = `${BASE_PATH}/faq.html`;
const DHF_GROUP_ID = 'Table_of_Contents_Decentralized_Hive_Fund_and_Proposals';
const DHF_FIRST_ANSWER_ID = 'What_is_the_Decentralized_Hive_Fund__DHF';
const DHF_QUESTION_COUNT = 8;

test.describe('FAQ — Decentralized Hive Fund and Proposals', () => {
  test('FAQ-DHF-01 — the table of contents lists the section, and every entry leads to its answer', async ({
    page
  }) => {
    await page.goto(FAQ_PATH);

    const article = page.locator('#articleBody');
    const group = article.locator(`h3:has(span[id="${DHF_GROUP_ID}"])`);
    await expect(group).toHaveText('Decentralized Hive Fund and Proposals');

    const entries = group.locator('xpath=following-sibling::ul[1]').getByRole('link');
    await expect(entries).toHaveCount(DHF_QUESTION_COUNT);
    await expect(entries.first()).toHaveText('What is the Decentralized Hive Fund (DHF)?');

    for (const href of await entries.evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      expect(href).toMatch(/^#/);
      const answer = article.locator(`h2:has(span[id="${href?.slice(1)}"])`);
      await expect(answer, `answer for ${href}`).toHaveCount(1);
    }
  });

  test('FAQ-DHF-02 — the first answer opens from its anchor and links back to the section', async ({ page }) => {
    await page.goto(`${FAQ_PATH}#${DHF_FIRST_ANSWER_ID}`);

    const article = page.locator('#articleBody');
    const heading = article.getByRole('heading', { name: 'What is the Decentralized Hive Fund (DHF)?' });
    await expect(heading).toBeInViewport();
    await expect(article).toContainText('It is held by the account @hive.fund');

    // The answer's last paragraph, just before the next question
    const backLink = heading.locator('xpath=following-sibling::h2[1]/preceding-sibling::p[1]/a');
    await expect(backLink).toHaveAttribute('href', `#${DHF_GROUP_ID}`);
  });

  test('FAQ-DHF-03 — the new tokens answer names the DHF and links to it', async ({ page }) => {
    await page.goto(FAQ_PATH);

    const link = page.locator('#articleBody li').getByRole('link', { name: 'Decentralized Hive Fund (DHF)', exact: true });
    await expect(link).toHaveAttribute('href', `#${DHF_FIRST_ANSWER_ID}`);
  });
});
