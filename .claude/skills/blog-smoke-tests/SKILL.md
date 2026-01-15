---
name: blog-smoke-tests
description: Run Playwright smoke tests for Denser blog application. Executes 15 tests (SMOKE-01 to SMOKE-15) against https://blog.openhive.network with retry support (max 3 attempts per failing test). Supports headed (visible browser) and headless modes. Use when testing blog functionality, verifying deployments, checking UI/API consistency, or when user requests smoke tests, playwright tests, or blog testing.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# Blog Smoke Tests Skill

Run Playwright smoke tests against the Denser blog application at https://blog.openhive.network.

## Workflow

### Step 1: Ask User Preferences

Before running tests, ask user:

1. **Browser mode**:
   - **Headed** (default) - `headless: false` - browser visible, good for debugging
   - **Headless** - `headless: true` - faster, for CI/CD

2. **Test scope**:
   - **All** - run all 15 tests
   - **P0** - critical tests only (SMOKE-01, 04, 08)
   - **P1** - important tests (SMOKE-05, 06, 07)
   - **P2** - tooltip tests (SMOKE-02, 03, 09)
   - **P3** - navigation tests (SMOKE-10, 11, 12)
   - **P4** - additional tests (SMOKE-13, 14, 15)

### Step 2: Copy Scripts to Temp Directory

```bash
mkdir -p /storage1/denser/apps/blog/playwright/temp_ai_script_tests
cp /storage1/denser/.claude/skills/blog-smoke-tests/scripts/smoke-*.mjs /storage1/denser/apps/blog/playwright/temp_ai_script_tests/
```

### Step 3: Run Tests with Retry Logic

For each test:
1. Run test script
2. If FAIL, retry up to 2 more times (max 3 attempts total)
3. Wait 2 seconds between retries
4. Track results for summary

**Command to run single test:**
```bash
cd /storage1/denser/apps/blog
HEADLESS=false pnpm exec node playwright/temp_ai_script_tests/smoke-XX-name.mjs
```

Replace `HEADLESS=false` with `HEADLESS=true` for headless mode.

### Step 4: Cleanup

After all tests complete:
```bash
rm -f /storage1/denser/apps/blog/playwright/temp_ai_script_tests/smoke-*.mjs
```

### Step 5: Summary

Present results in this format:

```
========================================
SMOKE TEST SUMMARY: X/Y PASSED
========================================
✓ [P0] SMOKE-01: Homepage Posts
✓ [P0] SMOKE-04: Post Navigation
✓ [P0] SMOKE-08: User Profile
✓ [P1] SMOKE-05: Votes API
...
✗ [P3] SMOKE-11: Categories (3 attempts)
...
========================================
```

## Test Catalog

| Priority | ID | Name | Script |
|----------|-----|------|--------|
| P0 | SMOKE-01 | Homepage Posts | smoke-01-homepage-posts.mjs |
| P0 | SMOKE-04 | Post Navigation | smoke-04-post-navigation.mjs |
| P0 | SMOKE-08 | User Profile | smoke-08-profile.mjs |
| P1 | SMOKE-05 | Votes API | smoke-05-votes-api.mjs |
| P1 | SMOKE-06 | Comments | smoke-06-comments.mjs |
| P1 | SMOKE-07 | Payout | smoke-07-payout.mjs |
| P2 | SMOKE-02 | Votes Tooltip | smoke-02-votes-tooltip.mjs |
| P2 | SMOKE-03 | Payout Tooltip | smoke-03-payout-tooltip.mjs |
| P2 | SMOKE-09 | Followers | smoke-09-followers.mjs |
| P3 | SMOKE-10 | Tags | smoke-10-tags.mjs |
| P3 | SMOKE-11 | Categories | smoke-11-categories.mjs |
| P3 | SMOKE-12 | Communities | smoke-12-communities.mjs |
| P4 | SMOKE-13 | Static Pages | smoke-13-static-pages.mjs |
| P4 | SMOKE-14 | Theme Toggle | smoke-14-theme.mjs |
| P4 | SMOKE-15 | Login Button | smoke-15-login.mjs |

## Retry Logic Pattern

```javascript
const MAX_RETRIES = 3;
let passed = false;
let attempts = 0;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  attempts = attempt;
  // Run test
  const exitCode = await runTest();

  if (exitCode === 0) {
    passed = true;
    break;
  }

  if (attempt < MAX_RETRIES) {
    console.log(`Retry ${attempt + 1}/${MAX_RETRIES} in 2 seconds...`);
    await sleep(2000);
  }
}
```

## Reference Documentation

- **Test patterns and selectors**: See [references/test-selectors.md](references/test-selectors.md)
- **Full documentation**: `/storage1/denser/PLAYWRIGHT_TESTING_NOTES.md`
- **Blog architecture**: `/storage1/denser/DENSER_BLOG_ARCHITECTURE.md`

## Environment

- **Production URL**: https://blog.openhive.network
- **API URL**: https://api.hive.blog
- **Working directory**: /storage1/denser/apps/blog
- **Temp scripts**: playwright/temp_ai_script_tests/
