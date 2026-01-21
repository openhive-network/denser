# Playwright Smoke Tests - Guide

## Quick Start

### Testing Rules

1. **Production URL**: `https://blog.openhive.network`
2. **API for verification**: `https://api.hive.blog`
3. **NO LOGIN** - we only test features available to unauthenticated users
4. **Temporary scripts**: `apps/blog/playwright/temp_ai_script_tests/*.mjs`
5. **After tests, DELETE scripts** from `temp_ai_script_tests/` folder

### Browser Launch Modes

Tests can be run in two modes depending on user preference:

| Mode | Code | When to use |
|------|------|-------------|
| **Headed** (with browser) | `chromium.launch({ headless: false })` | Debugging, showing user, learning |
| **Headless** (without browser) | `chromium.launch({ headless: true })` | CI/CD, faster tests, automation |

**By default use `headless: false`** so the user can see the test running in the browser.

### Running a Test

```bash
cd /storage1/denser/apps/blog
pnpm exec node playwright/temp_ai_script_tests/smoke-01-homepage-posts.mjs
```

### Running All Tests

```bash
cd /storage1/denser/apps/blog
for f in playwright/temp_ai_script_tests/smoke-*.mjs; do
  echo "=== $f ===" && pnpm exec node "$f"
done
```

---

## Catalog of 15 Smoke Tests

### Priority P0 - Critical (run first)

| ID | Test | What it checks | Key selectors |
|----|------|----------------|---------------|
| **SMOKE-01** | Homepage | /trending loads ≥20 posts, first post matches API | `post-list-item`, `post-author`, `post-title` |
| **SMOKE-04** | Post Navigation | Click on post → page with title, content, footer | `article-title`, `#articleBody`, `comment-votes` |
| **SMOKE-08** | User Profile | Profile stats for @gtg match API | `profile-name`, `profile-stats` |

### Priority P1 - Important

| ID | Test | What it checks | Key selectors |
|----|------|----------------|---------------|
| **SMOKE-05** | Votes API | Votes tooltip: top voter matches API (rshares) | `comment-votes`, `[data-state="open"]` |
| **SMOKE-06** | Comments | Comment count: post card = page = API children | `post-card-response-link`, `comment-list-item` |
| **SMOKE-07** | Payout | Payout value: post card = footer = API | `post-payout`, `comment-payout` |

### Priority P2 - Tooltips

| ID | Test | What it checks | Key selectors |
|----|------|----------------|---------------|
| **SMOKE-02** | Votes Tooltip (post card) | Hover on votes → tooltip with count | `post-total-votes`, `post-card-votes-tooltip` |
| **SMOKE-03** | Payout Tooltip (post card) | Hover on payout → breakdown (HBD, date) | `post-payout`, `payout-post-card-tooltip` |
| **SMOKE-09** | Followers/Following | Detailed profile stats vs API | `profile-stats li:nth(0-3)` |

### Priority P3 - Navigation

| ID | Test | What it checks | Key selectors |
|----|------|----------------|---------------|
| **SMOKE-10** | Tags | Click tag → filters posts | `a[href*="/trending/"]` |
| **SMOKE-11** | Categories | /trending vs /hot vs /created - different posts | `a[href="/hot"]`, `a[href="/created"]` |
| **SMOKE-12** | Communities | /communities loads list, navigation works | `community-list-item` |

### Priority P4 - Additional

| ID | Test | What it checks | Key selectors |
|----|------|----------------|---------------|
| **SMOKE-13** | Static Pages | /faq.html, /privacy.html, /tos.html → HTTP 200 | - |
| **SMOKE-14** | Theme Toggle | Theme switch button works | `button:has(svg[class*="sun"])` |
| **SMOKE-15** | Login Modal | Click Login → modal opens | `login-btn`, `login-dialog` |

---

## Smoke Test Template

```javascript
/**
 * SMOKE-XX: Test Name
 * Goal: Short description
 * Steps: 1. ... 2. ... 3. ...
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-XX: Test Name');
  console.log('========================================\n');

  // headless: true  = without visible browser (faster, for CI)
  // headless: false = with visible browser (for debugging, showing user)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    // PART 1: UI Actions - navigation with element waiting
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for specific element instead of timeout
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    // PART 2: Get data from UI
    const element = page.locator('[data-testid="..."]').first();
    const value = await element.textContent();

    // PART 3: Verify with API
    const apiRequest = { jsonrpc: '2.0', method: '...', params: {...}, id: 1 };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();

    // PART 4: Comparison
    if (uiValue === apiValue) {
      console.log('✓ PASS');
    } else {
      console.log('✗ FAIL');
      allPassed = false;
    }

    // SUMMARY
    console.log(allPassed ? '✓ SMOKE-XX: PASS' : '✗ SMOKE-XX: FAIL');
    return allPassed;

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runTest().then(passed => process.exit(passed ? 0 : 1));
```

---

## data-testid Selectors

### Homepage (/trending, /hot, /created)

| Selector | Element | Usage |
|----------|---------|-------|
| `post-list-item` | Post card | `page.locator('[data-testid="post-list-item"]').first()` |
| `post-author` | Author (@username) | `.locator('[data-testid="post-author"]')` |
| `post-title` | Title (contains `a` with link) | `.locator('[data-testid="post-title"] a')` |
| `post-payout` | Payout value ($XX.XX) | `.locator('[data-testid="post-payout"]')` |
| `post-total-votes` | Vote count | `.locator('[data-testid="post-total-votes"]')` |
| `post-card-response-link` | Comment count | `.locator('[data-testid="post-card-response-link"]')` |

### Post Page (/@author/permlink)

| Selector | Element | Notes |
|----------|---------|-------|
| `article-title` | Article title | - |
| `#articleBody` | Content | **Use `.first()`** - multiple elements! |
| `comment-votes` | Votes in footer | **Use `.first()`** |
| `comment-payout` | Payout in footer | **Use `.first()`** |
| `upvote-button` | Upvote button | - |
| `downvote-button` | Downvote button | - |
| `comment-reply` | Reply button | - |
| `comment-list-item` | Single comment | - |
| `author-name-link` | Link to author | - |

### User Profile (/@username)

| Selector | Element | Index in `profile-stats` |
|----------|---------|--------------------------|
| `profile-name` | Name (e.g. "Gandalf (75)") | - |
| `profile-about` | Bio/description | - |
| `profile-stats` | Stats container | - |
| `profile-stats li:nth(0)` | Followers | `profileStats.locator('li').nth(0)` |
| `profile-stats li:nth(1)` | Posts | `profileStats.locator('li').nth(1)` |
| `profile-stats li:nth(2)` | Following | `profileStats.locator('li').nth(2)` |
| `profile-stats li:nth(3)` | HP | `profileStats.locator('li').nth(3)` |

### Tooltips (Radix UI)

| Selector | Usage |
|----------|-------|
| `[data-state="open"]` | Open tooltip/popover after hover |
| `post-card-votes-tooltip` | Votes tooltip on post card |
| `payout-post-card-tooltip` | Payout tooltip on post card |

### Other

| Selector | Element |
|----------|---------|
| `login-btn` | Login button in navbar |
| `login-dialog` | Login modal |
| `community-list-item` | Element in communities list |

---

## Hive API - Most Commonly Used

### bridge.get_ranked_posts (list of posts)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_ranked_posts',
  params: {
    sort: 'trending',  // 'trending' | 'hot' | 'created'
    tag: '',           // community/tag or ''
    observer: '',      // for personalization (optional)
    limit: 20
  },
  id: 1
};
// Returns: result[].author, result[].permlink, result[].title, result[].pending_payout_value
```

### bridge.get_post (post details)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: { author: 'username', permlink: 'post-slug', observer: '' },
  id: 1
};
// Returns: title, children, pending_payout_value, active_votes[], is_paidout
// NOTE: active_votes limited to 1000 entries!
```

### condenser_api.get_accounts (account data)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_accounts',
  params: [['username']],  // array in array!
  id: 1
};
// Returns: result[0].name, post_count, posting_json_metadata
```

### condenser_api.get_follow_count (followers/following)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_follow_count',
  params: ['username'],
  id: 1
};
// Returns: follower_count, following_count
```

### bridge.list_communities (communities list)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.list_communities',
  params: { last: '', limit: 20, query: null, sort: 'rank', observer: '' },
  id: 1
};
// Returns: result[].name (hive-xxxxx), title, subscribers
```

---

## Code Patterns

### Getting the first post from /trending

```javascript
const firstPost = page.locator('[data-testid="post-list-item"]').first();

// Author
const authorElement = firstPost.locator('[data-testid="post-author"]');
const authorText = await authorElement.textContent();
const author = authorText?.trim().replace('@', '') || '';

// Title and link
const titleElement = firstPost.locator('[data-testid="post-title"] a');
const postLink = await titleElement.getAttribute('href');

// Permlink from URL (/community/@author/permlink)
const permlink = postLink?.split('/').pop() || '';
```

### Hover and read tooltip

```javascript
const element = page.locator('[data-testid="post-total-votes"]').first();
await element.scrollIntoViewIfNeeded();
await element.hover();

// Wait for tooltip to appear instead of timeout
const tooltip = page.locator('[data-state="open"]');
await tooltip.waitFor({ state: 'visible', timeout: 5000 });
const tooltipText = await tooltip.textContent();
```

### Parsing values from UI

```javascript
// Payout: "$61.28" -> 61.28
const payoutValue = parseFloat(text.replace('$', '').trim()) || 0;

// Number with separators: "10,925 followers" -> 10925
const count = parseInt(text.replace(/[^\d]/g, '')) || 0;

// Author: "@username" -> "username"
const author = text?.trim().replace('@', '') || '';
```

### Payout logic from API

```javascript
const pendingPayout = parseFloat(post.pending_payout_value?.replace(' HBD', '') || '0');
const curatorPayout = parseFloat(post.curator_payout_value?.replace(' HBD', '') || '0');
const authorPayout = parseFloat(post.author_payout_value?.replace(' HBD', '') || '0');

// Before payout: pending_payout_value
// After payout: curator + author
const payout = post.is_paidout ? (curatorPayout + authorPayout) : pendingPayout;
```

---

## Comparison Tolerances

| Data type | Tolerance | Reason |
|-----------|-----------|--------|
| Payout | ±$0.10 | Rounding, cache |
| Followers/Following | ±50 | Cache may be outdated |
| Posts count | ±10 | Cache |
| Vote count | ±10 or 1000 limit | API limits active_votes to 1000 |

---

## Waiting for Page Load (Best Practices)

**IMPORTANT: Avoid `waitForTimeout` - use explicit element waits!**

### Homepage (/trending, /hot, /created)

```javascript
await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for first post - this means the list has loaded
await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });
```

### Post Page

```javascript
await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for article content
await page.locator('#articleBody').first().waitFor({ state: 'visible', timeout: 30000 });
```

### User Profile

```javascript
await page.goto(`${BASE_URL}/@username`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for profile stats
await page.locator('[data-testid="profile-stats"]').waitFor({ state: 'visible', timeout: 30000 });
```

### Communities List

```javascript
await page.goto(`${BASE_URL}/communities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for first list element
await page.locator('[data-testid="community-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });
```

### After Click (navigation)

```javascript
await titleElement.click();
// Wait for URL or element on target page
await page.waitForURL('**/@*/**', { timeout: 30000 });
// OR wait for element
await page.locator('[data-testid="article-title"]').waitFor({ state: 'visible', timeout: 30000 });
```

### After Hover (tooltip)

```javascript
await element.hover();
// Wait for tooltip
await page.locator('[data-state="open"]').waitFor({ state: 'visible', timeout: 5000 });
```

### General Pattern

| Instead of | Use |
|------------|-----|
| `waitForTimeout(5000)` | `element.waitFor({ state: 'visible', timeout: 30000 })` |
| `waitForTimeout(X)` after goto | `page.waitForLoadState('networkidle')` or `element.waitFor()` |
| `waitForTimeout(X)` after click | `page.waitForURL()` or `targetElement.waitFor()` |
| `waitForTimeout(X)` after hover | `tooltip.waitFor({ state: 'visible' })` |

---

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Timeout 60000ms exceeded` | Page didn't load | Increase timeout, check network |
| `strict mode violation` | Selector returns multiple elements | Add `.first()` |
| `element is not visible` | Element outside viewport | Use `scrollIntoViewIfNeeded()` |
| `Difference > tolerance` | Cache is outdated | Increase tolerance |
| `locator.fill: element is disabled` | Field is disabled | Check `isDisabled()` before action |
| `active_votes.length = 1000` | API limit | Add tolerance for posts with >1000 votes |

---

## Debugging

```javascript
// Enable visible browser
const browser = await chromium.launch({ headless: false });

// Slow down execution (500ms between actions)
const browser = await chromium.launch({ headless: false, slowMo: 500 });

// Pause test interactively (requires headless: false)
await page.pause();

// Log more data
console.log('HTML:', await element.innerHTML());
console.log('All text:', await page.locator('body').textContent());

// Take screenshot
await page.screenshot({ path: 'debug.png' });
```

---

## Cleanup After Tests

**IMPORTANT: After testing, DELETE the scripts!**

```bash
rm -f apps/blog/playwright/temp_ai_script_tests/smoke-*.mjs
```

---

## Documentation

- **Application architecture**: `denser-blog-architecture.md`
- **Hive API docs**: https://developers.hive.io/
- **Playwright docs**: https://playwright.dev/docs/intro
