import { test, expect } from '../support/fixture-proxy-test';
import { WelcomePage } from '../support/pages/welcomePage';
import { FaqPage } from '../support/pages/faqPage';
import { TOSPage } from '../support/pages/tosPage';
import { PrivacyPolicyPage } from '../support/pages/privacyPolicyPage';

/**
 * Static Pages fixture tests — covers test plan section 1.8 (Anonymous user).
 *
 * View-only checks for `/welcome`, `/faq.html`, `/tos.html`, `/privacy.html`:
 * the page renders without crashing, the URL is correct, the article container
 * is visible and key structural elements (headings, content, CTAs) are present.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture -- staticPages
 * Replay:  pnpm --filter @hive/blog test:fixture -- staticPages
 */

test.use({ fixtureTestName: 'staticPages' });

test.describe('Static pages (1.8) — anonymous user (fixture-based)', () => {
  // ── ANON-STAT-01 — Welcome page ─────────────────────────────────────

  test.describe('ANON-STAT-01 Welcome page', () => {
    let welcomePage: WelcomePage;

    test.beforeEach(async ({ page }) => {
      welcomePage = new WelcomePage(page);
      await welcomePage.goto();
    });

    test('lands on /welcome with the article body visible', async ({ page }) => {
      await expect(page).toHaveURL(/\/welcome$/);
      await expect(welcomePage.articleBody).toBeVisible();
    });

    test('renders the main heading and onboarding subtitles', async () => {
      await expect(welcomePage.mainHeading).toBeVisible();

      const count = await welcomePage.subtitles.count();
      expect(count).toBeGreaterThan(0);
      await expect(welcomePage.subtitles.first()).toBeVisible();
    });

    test('renders CTA / additional-resource links', async () => {
      await expect(welcomePage.faqLink).toBeVisible();
      await expect(welcomePage.hiveWhitepaperLink).toBeVisible();
      await expect(welcomePage.appsBuiltOnHiveLink).toBeVisible();
      await expect(welcomePage.hiveBlockExplorerLink).toBeVisible();
    });
  });

  // ── ANON-STAT-02 — FAQ ──────────────────────────────────────────────

  test.describe('ANON-STAT-02 FAQ page', () => {
    let faqPage: FaqPage;

    test.beforeEach(async ({ page }) => {
      faqPage = new FaqPage(page);
      await faqPage.goto();
    });

    test('lands on /faq.html with the article body visible', async ({ page }) => {
      await expect(page).toHaveURL(/\/faq\.html$/);
      await expect(faqPage.articleBody).toBeVisible();
    });

    test('renders the main FAQ title', async () => {
      await expect(faqPage.mainTitle).toBeVisible();
    });

    test('renders the table of contents (FAQ topic items)', async () => {
      const count = await faqPage.subTopicsOfContent.count();
      expect(count).toBeGreaterThan(0);
      await expect(faqPage.firstSubTopicOfContent).toBeVisible();
    });

    test('renders representative FAQ topic links', async () => {
      await expect(faqPage.whatIsHiveBlogLink).toBeVisible();
      await expect(faqPage.isThereGithubPageForHiveBlogLink).toBeVisible();
      await expect(faqPage.canIEarnDigitalTokensOnHiveLink).toBeVisible();
    });
  });

  // ── ANON-STAT-03 — Terms of Service ─────────────────────────────────

  test.describe('ANON-STAT-03 Terms of Service page', () => {
    let tosPage: TOSPage;

    test.beforeEach(async ({ page }) => {
      tosPage = new TOSPage(page);
      await tosPage.goto();
    });

    test('lands on /tos.html with the article body visible', async ({ page }) => {
      await expect(page).toHaveURL(/\/tos\.html$/);
      await expect(tosPage.mainElement).toBeVisible();
    });

    test('renders ToS subtitles (section headings)', async () => {
      const count = await tosPage.subtitles.count();
      expect(count).toBeGreaterThan(0);
      await expect(tosPage.firstSubtitle).toBeVisible();
    });

    test('renders ToS body paragraph text', async () => {
      await expect(tosPage.paragrafText).toBeVisible();
    });
  });

  // ── ANON-STAT-04 — Privacy Policy ───────────────────────────────────

  test.describe('ANON-STAT-04 Privacy Policy page', () => {
    let privacyPolicyPage: PrivacyPolicyPage;

    test.beforeEach(async ({ page }) => {
      privacyPolicyPage = new PrivacyPolicyPage(page);
      await privacyPolicyPage.goto();
    });

    test('lands on /privacy.html with the article body visible', async ({ page }) => {
      await expect(page).toHaveURL(/\/privacy\.html$/);
      await expect(privacyPolicyPage.mainElement).toBeVisible();
    });

    test('renders the main "Privacy Policy" heading', async () => {
      await expect(privacyPolicyPage.mainHeading).toBeVisible();
    });

    test('renders Privacy Policy subtitles (section headings)', async () => {
      const count = await privacyPolicyPage.subtitles.count();
      expect(count).toBeGreaterThan(0);
      await expect(privacyPolicyPage.firstSubtitle).toBeVisible();
    });

    test('renders Privacy Policy body paragraph text', async () => {
      await expect(privacyPolicyPage.firstParagraf).toBeVisible();
    });
  });
});
