---
name: visual-screenshot-tests
description: Run visual regression tests for the Denser blog application. Executes Playwright screenshot tests against configurable environment, compares current screenshots with base screenshots pixel-by-pixel, generates diff images highlighting differences, and presents a visual comparison report. Use when verifying visual consistency, checking for UI regressions, or before/after deployments.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - Task
---

# Visual Screenshot Tests Skill

Run visual regression tests by comparing current application screenshots against approved base screenshots.

## Features

- **Automated screenshot capture** - runs Playwright tests to capture current state
- **Pixel-level comparison** - compares each screenshot against base version
- **Diff image generation** - creates visual diff highlighting changed areas (red = changed, magenta = size mismatch)
- **Configurable threshold** - adjustable pixel difference tolerance
- **Multimodal analysis** - Claude reads and visually inspects screenshots and diffs
- **Base screenshot update** - option to approve and update base screenshots

## Workflow

### Step 1: Ask User Preferences

Before running tests, ask user:

1. **Target environment**:
   - **Production** (default) - https://blog.openhive.network
   - **Dev** - https://blog.dev.openhive.network
   - **Localhost** - http://localhost:3000

2. **Browser mode**:
   - **Headless** (default) - faster execution
   - **Headed** - visible browser for debugging

### Step 2: Run Screenshot Tests

Run the Playwright screenshot spec to capture current screenshots:

```bash
cd /home/dev/Workspace/newDesnerRepo/denser/apps/blog

# Clean previous current screenshots
rm -rf playwright/current-screenshots
mkdir -p playwright/current-screenshots

# Run screenshot tests (headless, production)
BASE_URL=https://blog.openhive.network npx playwright test playwright/tests/e2e/screenshots.spec.ts --project=chromium --headed=false

# Or with specific environment and mode:
# BASE_URL=<url> npx playwright test playwright/tests/e2e/screenshots.spec.ts --project=chromium [--headed]
```

**Environment variables:**
- `BASE_URL` - target URL to screenshot
- Add `--headed` flag for visible browser mode

**Important:** If any test fails, report the failure but continue with comparison of screenshots that were captured successfully.

### Step 3: Run Comparison Script

Compare current screenshots against base screenshots:

```bash
cd /home/dev/Workspace/newDesnerRepo/denser/apps/blog
node /home/dev/Workspace/newDesnerRepo/denser/.claude/skills/visual-screenshot-tests/scripts/compare-screenshots.mjs \
  --base-dir playwright/base-screenshots \
  --current-dir playwright/current-screenshots \
  --diff-dir playwright/diff-screenshots \
  --threshold 0.1
```

The script will:
- Compare each PNG in `base-screenshots/` with its counterpart in `current-screenshots/`
- Generate diff images in `diff-screenshots/` (red pixels = differences, magenta = size mismatch areas)
- Output a `__COMPARE_RESULT__` JSON line with structured results
- Report missing screenshots, dimension mismatches, and pixel differences

**Pass criteria:** Less than 1% pixel difference = PASS

### Step 4: Visual Inspection (Multimodal)

After running the comparison script, use the Read tool to visually inspect the images:

1. **For each screenshot comparison**, read the following images:
   - Base screenshot: `playwright/base-screenshots/<name>.png`
   - Current screenshot: `playwright/current-screenshots/<name>.png`
   - Diff image (if generated): `playwright/diff-screenshots/diff-<name>.png`

2. **Visually analyze** each pair looking for:
   - Layout shifts or broken layouts
   - Missing or misplaced elements
   - Font or text rendering changes
   - Color or theme changes
   - Broken images or icons
   - Responsive/sizing issues
   - Content that changed (dynamic data is expected to differ)

3. **Distinguish between**:
   - **Expected differences**: Dynamic content (post titles, timestamps, usernames, vote counts) - these are normal
   - **Unexpected differences**: Layout changes, missing components, broken styling, structural changes - these are regressions

### Step 5: Present Report

Present a structured report:

```
========================================
VISUAL REGRESSION REPORT
========================================
Environment: <url>
Date: <date>
Threshold: <threshold>

SUMMARY: X/Y screenshots PASSED
========================================

Screenshot: homepage.png
Status: PASS / FAIL
Diff: X.XX% (XXXX/XXXXXXX pixels)
Dimensions: WxH (base) vs WxH (current)
Visual analysis:
  - <description of what changed>
  - <whether changes are expected or regression>

Screenshot: login-dialog.png
Status: PASS / FAIL
...

Screenshot: community-worldmappin.png
Status: PASS / FAIL
...

========================================
CONCLUSION
========================================
<Overall assessment: are views correct or are there regressions?>
<List any regressions found>
<Recommendations>

Files:
- Base screenshots: playwright/base-screenshots/
- Current screenshots: playwright/current-screenshots/
- Diff images: playwright/diff-screenshots/
========================================
```

### Step 6: Ask About Base Update (if needed)

If all screenshots look correct (even if pixel diff is high due to dynamic content), ask the user:

> "Current screenshots look correct. Would you like to update the base screenshots with the current ones?"

If user agrees:
```bash
cp /home/dev/Workspace/newDesnerRepo/denser/apps/blog/playwright/current-screenshots/*.png \
   /home/dev/Workspace/newDesnerRepo/denser/apps/blog/playwright/base-screenshots/
```

## Screenshot Inventory

Current screenshots captured by `screenshots.spec.ts`:

| Screenshot | Description | Full Page |
|-----------|-------------|-----------|
| `homepage.png` | Homepage with 20 posts loaded | Yes |
| `login-dialog.png` | Login dialog (sign in form) | No |
| `community-worldmappin.png` | Worldmappin community page | Yes |

## Directories

| Path | Purpose |
|------|---------|
| `apps/blog/playwright/base-screenshots/` | Approved baseline screenshots |
| `apps/blog/playwright/current-screenshots/` | Screenshots from latest test run |
| `apps/blog/playwright/diff-screenshots/` | Generated diff images |
| `apps/blog/playwright/tests/e2e/screenshots.spec.ts` | Screenshot test spec |

## Diff Image Legend

| Color | Meaning |
|-------|---------|
| **Red pixels** | Pixels that differ between base and current |
| **Magenta pixels** | Areas where images have different dimensions |
| **Dimmed/dark pixels** | Pixels that match (shown at 50% brightness) |

## Threshold Configuration

The `--threshold` parameter (0.0 to 1.0) controls sensitivity:
- `0.0` - exact match required (very strict, may flag anti-aliasing)
- `0.1` - default, allows minor rendering differences
- `0.3` - lenient, good for cross-platform comparison
- `1.0` - only completely different pixels flagged

## Adding New Screenshots

To add a new screenshot to the test suite:

1. Add a new test case to `apps/blog/playwright/tests/e2e/screenshots.spec.ts`:
```typescript
test('New page screenshot', async ({ page }) => {
  // Navigate and wait for content
  await page.goto('/some-page');
  await page.waitForSelector('[data-testid="expected-element"]');
  await page.screenshot({ path: 'playwright/current-screenshots/new-page.png', fullPage: true });
});
```

2. Run the tests once to generate the initial screenshot
3. Copy to base-screenshots:
```bash
cp apps/blog/playwright/current-screenshots/new-page.png apps/blog/playwright/base-screenshots/
```

## Environments

| Environment | URL |
|-------------|-----|
| Production | `https://blog.openhive.network` |
| Dev | `https://blog.dev.openhive.network` |
| Localhost | `http://localhost:3000` |
