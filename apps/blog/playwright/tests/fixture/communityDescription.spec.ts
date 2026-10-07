import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS } from '../support/initialChunks';
import { CommunitiesPage } from '../support/pages/communitiesPage';

/**
 * The community sidebar's description is rendered on the server, so a community page shows it
 * without loading the content renderer.
 *
 * The `communityDescription` recording gives hive-139531 a description with a site link, an
 * external link, an image, a mention, a hashtag, inline code, a table, a YouTube link (a facade)
 * and a Vimeo iframe. EXPECTED_HTML is what the browser rendered for it when the sidebar still
 * rendered it client-side: links in the sidebar's link style, code wrapping, and each embed shown
 * as its video's URL.
 */

const COMMUNITY_PATH = '/trending/hive-139531';

const BANNER = 'https://images.hive.blog/DQmZ1fixtureBannerImage/banner.png';
const PROXIED_BANNER =
  'https://images.hive.blog/p/5CEvyaWxjaEsGxi26i8dgeu8wuF6Dgnx4x2VcVFp3SfRoFoxctApV6enbzgdpN7v22dVjHb1HTxcQFo8S';
const BANNER_SRCSET = [480, 640, 768, 1024, 1536]
  .map((width) => `${PROXIED_BANNER}?format=webp&amp;mode=fit&amp;width=${width} ${width}w`)
  .join(', ');
const LINK_CLASS = ' text-destructive break-words';

const EXPECTED_HTML = [
  `<p>Welcome to the <strong>Hive Fixture</strong> community. Read the <a href="/@hiveio/community-guide" class="${LINK_CLASS}">community guide</a> and the rules at <a href="https://example.com/rules" rel="nofollow noopener" target="_blank" class="${LINK_CLASS}">https://example.com/rules</a> before posting.</p>`,
  `<p><img src="${BANNER}" srcset="${BANNER_SRCSET}" sizes="(min-width: 1344px) 854px, (min-width: 768px) calc(66.67vw - 42px), calc(100vw - 42px)" alt="Community banner" loading="lazy" decoding="async"></p>`,
  `<p>Ask <a href="/@hiveio" class="${LINK_CLASS}">@hiveio</a> about <a href="/trending/hive" class="${LINK_CLASS}">#hive</a> governance, or run <code class="whitespace-normal">hive --help</code>.</p>`,
  '<div style="overflow-x: auto; width: 100%; display: block;"><table>',
  '<thead>',
  '<tr><th>Day</th><th>Topic</th></tr>',
  '</thead>',
  '<tbody>',
  '<tr><td>Monday</td><td>Photography</td></tr>',
  '</tbody>',
  '</table></div>',
  '<p></p><div class="">https://www.youtube.com/watch?v=dQw4w9WgXcQ</div><p></p>',
  '<div class="">https://player.vimeo.com/video/76979871</div>'
].join('\n');

test.use({ fixtureTestName: 'communityDescription' });

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('COMM-DESC-01 — the server HTML carries the rendered description', async ({ page }) => {
    await page.goto(COMMUNITY_PATH);
    const { communityDescriptionConntent } = new CommunitiesPage(page);
    expect(await communityDescriptionConntent.innerHTML()).toBe(EXPECTED_HTML);
  });
});

test('COMM-DESC-02 — the hydrated page shows the server-rendered description and never loads the renderer', async ({
  page
}) => {
  const scripts: Promise<string>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') scripts.push(response.text().catch(() => ''));
  });

  await page.goto(COMMUNITY_PATH);
  await page.waitForLoadState('networkidle');
  const { communityDescriptionConntent } = new CommunitiesPage(page);
  expect(await communityDescriptionConntent.innerHTML()).toBe(EXPECTED_HTML);

  const loaded = await Promise.all(scripts);
  expect(loaded.length).toBeGreaterThan(0);
  expect(loaded.filter((script) => script.includes(CHUNK_MARKERS.renderer))).toEqual([]);
});

test('COMM-DESC-03 — an external description link asks before leaving the site', async ({ page }) => {
  await page.goto(COMMUNITY_PATH);
  await page.waitForLoadState('networkidle');
  const { communityDescriptionConntent } = new CommunitiesPage(page);
  const dialog = page.getByRole('dialog');

  await communityDescriptionConntent.getByRole('link', { name: 'https://example.com/rules' }).click();
  await expect(dialog).toContainText('You are about to leave this app.');
  await expect(dialog).toContainText('https://example.com/rules');
  await expect(page).toHaveURL(new RegExp(`${COMMUNITY_PATH}$`));
});
