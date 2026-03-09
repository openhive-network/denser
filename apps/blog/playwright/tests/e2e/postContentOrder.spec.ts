import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { chromiumOnly, assertDefined } from '../support/testHelpers';

/**
 * Tests that post content sections render in the correct order.
 *
 * Catches regressions where the renderer displaces text blocks
 * (e.g. links moved to the end of the post, intro text after footer).
 */

test.describe('Post content order regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('witness update post content renders in correct order', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage('hive-139531', 'mahdiyari', 'witness-update-public-nodes-update');
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(postPage.articleBody).toHaveScreenshot('witness-update-public-nodes.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('GitLab/GitHub link position regression (issue #613)', () => {
  const fixturePost = {
    community: 'hive-160391',
    author: 'gtg',
    permlink: 'hive-hardfork-25-jump-starter-kit'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('GitLab and GitHub links render inline, not moved to the end of the post', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // GitLab link and its following text must appear before the GitHub section
    const gitlabLinkPos = bodyText.indexOf('gitlab.syncad.com/hive/hive');
    const gitlabDescPos = bodyText.indexOf('Our core development efforts');
    const githubHeadingPos = bodyText.indexOf('GitHub');

    expect(gitlabLinkPos, 'GitLab link should exist in content').toBeGreaterThanOrEqual(0);
    expect(gitlabDescPos, 'GitLab description should exist').toBeGreaterThanOrEqual(0);

    expect(
      gitlabLinkPos,
      'GitLab link must appear before its description text'
    ).toBeLessThan(gitlabDescPos);

    expect(
      gitlabDescPos,
      'GitLab description must appear before the GitHub section'
    ).toBeLessThan(githubHeadingPos);

    // GitHub link and its following text must appear before the Services section
    const githubLinkPos = bodyText.indexOf('github.com/openhive-network/hive');
    const githubDescPos = bodyText.indexOf('We use it as a push mirror');
    const servicesPos = bodyText.indexOf('Services');

    expect(githubLinkPos, 'GitHub link should exist in content').toBeGreaterThanOrEqual(0);
    expect(githubDescPos, 'GitHub description should exist').toBeGreaterThanOrEqual(0);

    expect(
      githubLinkPos,
      'GitHub link must appear before its description text'
    ).toBeLessThan(githubDescPos);

    expect(
      githubDescPos,
      'GitHub description must appear before the Services section'
    ).toBeLessThan(servicesPos);
  });

  test('links are not duplicated at the bottom of the post', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // The "All resources are offered AS IS" text is near the end of the post.
    // GitLab/GitHub links should NOT appear after it.
    const asIsPos = bodyText.indexOf('All resources are offered AS IS');
    expect(asIsPos, '"All resources are offered AS IS" should exist').toBeGreaterThanOrEqual(0);

    const textAfterAsIs = bodyText.substring(asIsPos);
    expect(
      textAfterAsIs,
      'GitLab link should not be moved to the end of the post'
    ).not.toContain('gitlab.syncad.com/hive/hive');

    expect(
      textAfterAsIs,
      'GitHub link should not be moved to the end of the post'
    ).not.toContain('github.com/openhive-network/hive');
  });
});

test.describe('Instagram link crashes post rendering regression (issue #601)', () => {
  const fixturePost = {
    community: 'hive-163772',
    author: 'intoy.bugoy',
    permlink: 'scenic-view-of-lantaw-compostela-cebu-philippines-lakwatsaniintoydiary-071-7jh'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('post intro text renders at the top, not displaced to the bottom by Instagram link', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // The intro text must appear near the top of the post, before the main content
    const introPos = bodyText.indexOf('Heyaah Hivers');
    const restaurantPos = bodyText.indexOf('Lantaw Restaurant');
    const instagramPos = bodyText.indexOf('INSTAGRAM');
    const inleoPos = bodyText.indexOf('Posted Using');

    expect(introPos, 'Intro text should exist in content').toBeGreaterThanOrEqual(0);
    expect(restaurantPos, 'Restaurant description should exist').toBeGreaterThanOrEqual(0);
    expect(instagramPos, 'Instagram link should exist').toBeGreaterThanOrEqual(0);
    expect(inleoPos, 'INLEO footer should exist').toBeGreaterThanOrEqual(0);

    // Correct order: intro -> restaurant content -> Instagram social links -> INLEO footer
    expect(
      introPos,
      'Intro must appear before restaurant description (not displaced to bottom)'
    ).toBeLessThan(restaurantPos);

    expect(
      restaurantPos,
      'Restaurant description must appear before Instagram social links'
    ).toBeLessThan(instagramPos);

    expect(
      instagramPos,
      'Instagram link must appear before INLEO footer'
    ).toBeLessThan(inleoPos);
  });

  test('intro text is not duplicated after INLEO footer', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // "Posted Using INLEO" is the last real content line
    const inleoPos = bodyText.indexOf('Posted Using');
    expect(inleoPos, 'INLEO footer should exist').toBeGreaterThanOrEqual(0);

    const textAfterFooter = bodyText.substring(inleoPos);
    expect(
      textAfterFooter,
      'Intro text should not be displaced after the INLEO footer'
    ).not.toContain('Heyaah Hivers');
  });
});

test.describe('Post content position regression — algorytmiczny-2024', () => {
  const fixturePost = {
    community: 'engrave',
    author: 'bowess',
    permlink: 'algorytmiczny-2024-jak-google-widzi-bloga'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('content sections render in the correct order', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // Key content landmarks in expected order
    const landmarks = [
      { label: 'intro', text: 'Co tam słychać w bańce Google' },
      { label: 'HCU discussion', text: 'E-E-A-T' },
      { label: 'stats section', text: 'Do konkretów' },
      { label: 'search trends', text: 'Ebrechtella tricuspitata' },
      { label: 'analytics section', text: 'Analytics za rok 2024' },
      { label: 'footer', text: 'Lectorium' }
    ];

    let previousPos = -1;
    let previousLabel = '';

    for (const { label, text } of landmarks) {
      const pos = bodyText.indexOf(text);
      expect(pos, `"${label}" text should exist in content`).toBeGreaterThanOrEqual(0);

      if (previousPos >= 0) {
        expect(
          pos,
          `"${label}" must appear after "${previousLabel}" (not displaced)`
        ).toBeGreaterThan(previousPos);
      }

      previousPos = pos;
      previousLabel = label;
    }
  });

  test('tables with comparison data are rendered', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    // Post contains 3 tables: seasonal search trends, analytics, and lectorium/czekolada
    const tables = postPage.articleBody.locator('table');
    await expect(tables).toHaveCount(3);

    // First table has seasonal comparison headers
    const firstTableHeaders = tables.nth(0).locator('th');
    await expect(firstTableHeaders.nth(0)).toContainText('Kwiecień 2024');
    await expect(firstTableHeaders.nth(1)).toContainText('Kwiecień 2025');
  });

  test('external links are not displaced to the end of the post', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    // The dBlog footer is the last content section
    const footerPos = bodyText.indexOf('napędzany przez');
    expect(footerPos, 'dBlog footer should exist').toBeGreaterThanOrEqual(0);

    const textAfterFooter = bodyText.substring(footerPos);

    // Key content fragments should NOT appear after the footer
    expect(textAfterFooter).not.toContain('Do konkretów');
    expect(textAfterFooter).not.toContain('Ebrechtella tricuspitata');
    expect(textAfterFooter).not.toContain('E-E-A-T');
  });
});

test.describe('Non-breaking space rendering inside HTML tags regression (issue #628)', () => {
  const fixturePost = {
    community: 'hive-151327',
    author: 'miprimerconcurso',
    permlink: 'beautiful-and-colorful-dung-mushrooms'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('&nbsp; inside HTML tags renders as whitespace, not as literal text', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    // The post uses &nbsp; inside <strong> tags — must NOT render as literal "&nbsp;"
    const literalNbsp = postPage.articleBody.getByText('&nbsp;');
    await expect(
      literalNbsp,
      '&nbsp; should render as whitespace, not as literal text'
    ).toHaveCount(0);

    // Verify the post content itself rendered correctly
    const communityText = postPage.articleBody.getByText('FungiFridayCommunity', { exact: false });
    await expect(communityText.first(), 'Community name should be visible').toBeVisible();
  });

  test('content order is preserved — intro text appears before mushroom descriptions', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const bodyText = await postPage.articleBody.textContent();
    assertDefined(bodyText, 'Article body should have text content');

    const communityPos = bodyText.indexOf('FungiFridayCommunity');
    const reservePos = bodyText.indexOf('reserve is a large area');
    const deconicaPos = bodyText.indexOf('Deconica');

    expect(communityPos, 'Community reference should exist').toBeGreaterThanOrEqual(0);
    expect(reservePos, 'Reserve description should exist').toBeGreaterThanOrEqual(0);
    expect(deconicaPos, 'Deconica mushroom reference should exist').toBeGreaterThanOrEqual(0);

    expect(
      communityPos,
      'Community intro must appear before reserve description'
    ).toBeLessThan(reservePos);

    expect(
      reservePos,
      'Reserve description must appear before Deconica section'
    ).toBeLessThan(deconicaPos);
  });
});
