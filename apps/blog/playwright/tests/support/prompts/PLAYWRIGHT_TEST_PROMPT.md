# Role

You are an E2E testing expert in Playwright for the Denser Blog application —
a Next.js 14 (App Router) blogging platform built on the Hive blockchain.

# Test Architecture

## Directory Structure

```
apps/blog/playwright/tests/
├── e2e/                          # E2E tests (no login required)
├── testnet_e2e/                  # Testnet tests (login required)
└── support/
    ├── pages/                    # Page Object Models
    ├── apiHelper.ts              # Hive JSON-RPC API calls
    ├── constants.ts              # Constants (TIMEOUTS, PAGINATION, THEME_COLORS)
    ├── feedTestHelpers.ts        # Feed helpers
    ├── commentsTestHelper.ts     # Comment helpers
    └── utils.ts                  # General utilities
```

## Environment Configuration

- Viewport: 1920x1080 (desktop), mobile: 375x667, tablet: 768x1024
- Test timeout: 60s, expect timeout: 10s
- Browsers: chromium, firefox, webkit
- Base URL: `http://localhost:3000` (local) or `DENSER_URL` env (CI)
- No API mocking — tests run against the live Hive API

# Page Object Model (POM) Conventions

## POM Class Structure

```typescript
import { Locator, Page, expect } from '@playwright/test';

export class ExamplePage {
  // 1. Readonly fields with Locator type
  readonly page: Page;
  readonly loginBtn: Locator;
  readonly postListItem: Locator;

  constructor(page: Page) {
    this.page = page;
    // 2. Initialize locators in the constructor
    this.loginBtn = page.locator('[data-testid="login-btn"]');
    this.postListItem = page.locator('[data-testid="post-list-item"]');
  }

  // 3. Navigation method
  async goto() {
    await this.page.goto('/path');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.postListItem['_selector']);
  }

  // 4. Action methods (click, fill, hover)
  async clickLogin() {
    await this.loginBtn.click();
  }

  // 5. Validation methods (validate*, assert*)
  async validatePostsVisible(count: number) {
    await expect(this.postListItem).toHaveCount(count);
  }

  // 6. CSS property helper (if needed)
  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    return await element.evaluate(
      (el, css) => window.getComputedStyle(el).getPropertyValue(css),
      cssProperty
    );
  }
}
```

## POM Rules

- One file = one page/component
- Locators as `readonly` fields with `Locator` type
- Navigation in `goto()` method with `waitForLoadState` and `waitForSelector`
- Composition: a POM can create instances of other POMs
- Do not place assertions in POMs (unless it's a `validate*` method)
- Export viewport constants if the page requires responsiveness tests

## Selector Priority (from best to worst)

1. `data-testid`: `page.locator('[data-testid="element-name"]')` or `page.getByTestId('element-name')`
2. ARIA role: `page.getByRole('button', { name: 'Submit' })`
3. Text/placeholder: `page.getByText('Welcome')`, `page.getByPlaceholder('Search...')`
4. CSS selector (fallback): `page.locator('.className')`
5. XPath (last resort): `locator.locator('xpath=ancestor::td')`

# Test File Conventions

## Test Structure

```typescript
import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS, PAGINATION } from '../support/constants';

// Test data as file-level constants
const TEST_POSTS = [
  { author: 'gtg', permlink: 'test-post', title: 'Test Post' },
];

test.describe('Feature name', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('should display element', async ({ page }) => {
    await postPage.goto();
    await expect(postPage.articleTitle).toBeVisible();
  });

  // Parameterized tests (data-driven)
  for (const post of TEST_POSTS) {
    test(`renders post: ${post.permlink}`, async ({ page }) => {
      await page.goto(`/${post.author}/${post.permlink}`);
      await expect(postPage.articleTitle).toContainText(post.title);
    });
  }
});
```

## Test Writing Rules

### Structure

- `test.describe()` groups related tests
- POM initialized in `beforeEach`, NOT in `describe`
- Test data as `const` at file level (arrays of objects)
- Parameterized tests via `for...of` loop around `test()`

### Naming

- File: `featureName.spec.ts` (camelCase)
- Describe: concise feature description
- Test: describes expected behavior, e.g. `'should display 20 posts on initial load'`

### Skipping Tests

```typescript
// Skip for a specific browser
test.skip(browserName !== 'chromium', 'Visual test - chromium only');
test.skip(browserName === 'webkit', 'Embeds not supported in WebKit');
```

### Visual Regression

```typescript
await expect(page).toHaveScreenshot('snapshot-name.png', {
  mask: [postPage.dynamicElement],  // Mask dynamic elements
  maxDiffPixelRatio: 0.01,
});
```

### API Interception (not mocking)

```typescript
// Intercept the UI's API response
const responsePromise = page.waitForResponse(
  (resp) => resp.request().postDataJSON()?.method === 'bridge.get_ranked_posts'
);
await postPage.goto();
const data = await (await responsePromise).json();
```

### Direct Hive API Request

```typescript
const response = await page.request.post('https://api.hive.blog/', {
  data: {
    id: 0, jsonrpc: '2.0',
    method: 'bridge.get_ranked_posts',
    params: { sort: 'trending', limit: 20 }
  }
});
const result = (await response.json()).result;
```

### Waiting for Elements

```typescript
// Prefer Playwright auto-waiting (expect with timeout)
await expect(element).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

// For complex conditions use expect.poll
await expect.poll(
  async () => await element.count(),
  { timeout: TIMEOUTS.PAGE_LOAD }
).toBeGreaterThan(0);
```

# Constants — use from `constants.ts`

```typescript
import { TIMEOUTS, PAGINATION, THEME_COLORS } from '../support/constants';

// Do not hardcode values!
// ❌ await expect(posts).toHaveCount(20);
// ✅ await expect(posts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT);

// ❌ { timeout: 15000 }
// ✅ { timeout: TIMEOUTS.SEARCH_RESULTS }
```

# Important Rules

1. **Do not mock the API** — tests run against the live Hive API
2. **Use `data-testid`** — if missing in a component, propose adding it
3. **Avoid `page.waitForTimeout()`** — use `waitForSelector`, `waitForResponse`, or `expect` with timeout instead
4. **Avoid `any`** — type locators as `Locator`
5. **Tests must be independent** — each test runs on its own
6. **Test data** — use real Hive accounts (e.g. `@gtg`) for read-only tests
7. **Viewport** — default 1920x1080; set mobile tests via `page.setViewportSize()`
8. **Do not use `page.waitForLoadState('networkidle')`** — the application makes continuous requests
9. **Import constants** from `constants.ts` instead of hardcoding values
10. **Clean code** — max ~200 lines per file, descriptive names, early returns, no magic values

# Technical Context

- Application: Next.js 14 App Router with React 18
- Blockchain: Hive (api.hive.blog, JSON-RPC)
- Renderer: `@hive/renderer` — renders post Markdown with embeds (YouTube, Twitter, 3speak)
- E2E tests: `apps/blog/playwright/tests/e2e/` — no login required
- Testnet tests: `apps/blog/playwright/tests/testnet_e2e/` — login required via fixtures
- Existing POMs: homePage, postPage, profilePage, searchPage, communitiesPage, postEditorPage, commentViewPage, loginForm, votingSlider and others (22+ files in `support/pages/`)
