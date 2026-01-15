# Test Selectors Reference

Quick reference for data-testid selectors used in smoke tests.

## Post List (Homepage, Categories, Tags)

| Selector | Element | Used in |
|----------|---------|---------|
| `[data-testid="post-list-item"]` | Post card in list | SMOKE-01, 04, 11, 12 |
| `[data-testid="post-title"]` | Post title link | SMOKE-01, 04, 11 |
| `[data-testid="post-author"]` | Author username | SMOKE-01 |
| `[data-testid="post-payout"]` | Payout value | SMOKE-03, 07 |
| `[data-testid="post-votes"]` | Vote count | SMOKE-02, 05 |
| `[data-testid="post-footer"]` | Post footer area | SMOKE-04 |

## Post Page (Single Post)

| Selector | Element | Used in |
|----------|---------|---------|
| `[data-testid="post-page-title"]` | Post title on page | SMOKE-04 |
| `[data-testid="post-page-content"]` | Post body content | SMOKE-04 |
| `[data-testid="post-page-footer"]` | Post page footer | SMOKE-04 |
| `[data-testid="comment-list"]` | Comments container | SMOKE-06 |
| `[data-testid="comment-list-item"]` | Single comment | SMOKE-06 |

## User Profile

| Selector | Element | Used in |
|----------|---------|---------|
| `[data-testid="user-post-count"]` | Number of posts | SMOKE-08 |
| `[data-testid="user-followers"]` | Followers count | SMOKE-08, 09 |
| `[data-testid="user-following"]` | Following count | SMOKE-08, 09 |

## Navigation & UI

| Selector | Element | Used in |
|----------|---------|---------|
| `[data-testid="login-btn"]` | Login button | SMOKE-15 |
| `button:has(svg[class*="sun"])` | Theme toggle (light) | SMOKE-14 |
| `button:has(svg[class*="moon"])` | Theme toggle (dark) | SMOKE-14 |

## Fallback Selectors

When data-testid is not available, tests use these fallbacks:

### Post Navigation
```javascript
// Title fallback
page.locator('h1, h2').first()

// Content fallback
page.locator('article, .post-content, [class*="content"]').first()
```

### Theme Toggle
```javascript
// By aria-label
page.locator('[aria-label*="theme"], [aria-label*="Theme"]')

// By data-testid pattern
page.locator('[data-testid*="theme"], [data-testid*="mode"]')
```

### Login Button
```javascript
// Text-based fallback
page.locator('button:has-text("Login"), a:has-text("Login")')
```

## API Endpoints

Tests verify UI data against these Hive API endpoints:

| Endpoint | Purpose | Used in |
|----------|---------|---------|
| `bridge.get_ranked_posts` | Get trending/hot/created posts | SMOKE-01, 05, 07 |
| `condenser_api.get_active_votes` | Get votes for a post | SMOKE-05 |
| `bridge.get_account_posts` | Get user's posts | SMOKE-08 |
| `condenser_api.get_follow_count` | Get followers/following | SMOKE-09 |

## Common Patterns

### Wait for posts to load
```javascript
await page.locator('[data-testid="post-list-item"]').first().waitFor({
  state: 'visible',
  timeout: 30000
});
```

### Get post count
```javascript
const count = await page.locator('[data-testid="post-list-item"]').count();
```

### Extract number from text
```javascript
const text = await element.textContent();
const number = parseInt(text.replace(/[^0-9]/g, ''), 10);
```

### Hover for tooltip
```javascript
await element.hover();
await page.waitForTimeout(500); // Allow tooltip to appear
const tooltip = page.locator('[role="tooltip"]');
```
