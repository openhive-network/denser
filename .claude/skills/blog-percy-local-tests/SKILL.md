---
name: blog-percy-local-tests
description: Run Percy visual regression tests for Denser blog against LOCAL localhost:3000. IMPORTANT - requires blog app running locally first (pnpm build && pnpm start). Captures 8 visual snapshots (Homepage, Profile, Post, Community in Light/Dark themes) and uploads to BrowserStack Percy. Also requires PERCY_TOKEN in .env.local. Use for visual regression testing, UI consistency checks, or when user requests Percy/visual tests.
allowed-tools:
  - Bash
  - Read
  - Glob
---

# Blog Percy Local Tests Skill

Run Percy visual regression tests against the Denser blog application running locally on localhost:3000.

## Features

- **8 visual snapshots** - 4 pages × 2 themes (Light/Dark)
- **BrowserStack Percy** - cloud-based visual comparison
- **Automatic diff detection** - highlights visual changes between builds
- **Theme testing** - validates both Light and Dark modes

## Prerequisites

### 1. Percy Token

Check if `PERCY_TOKEN` is configured in `.env.local`:

```bash
cd /storage1/denser/apps/blog
grep -q "PERCY_TOKEN" .env.local && echo "Token configured" || echo "Token missing"
```

If missing, inform user to:
1. Get token from https://percy.io/settings
2. Add to `apps/blog/.env.local`: `PERCY_TOKEN=your_token_here`

### 2. Blog Application Running

Percy tests require the blog running on `localhost:3000`:

```bash
# Check if blog is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|302" && echo "Blog is running" || echo "Blog not running"
```

If not running, start it:

```bash
cd /storage1/denser/apps/blog
pnpm build && pnpm start &
# Wait for startup
sleep 10
```

## Workflow

### Step 1: Verify Prerequisites (MANDATORY - DO THIS FIRST)

**IMPORTANT: You MUST verify both prerequisites BEFORE asking about browser mode or running any tests.**

Run these checks first:

```bash
cd /storage1/denser/apps/blog

# Check Percy token
if grep -q "PERCY_TOKEN=." .env.local 2>/dev/null; then
  echo "✓ Percy token configured"
else
  echo "✗ Percy token missing - add PERCY_TOKEN to .env.local"
fi

# Check blog is running on localhost:3000
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^(200|302|304)$ ]]; then
  echo "✓ Blog is running on localhost:3000"
else
  echo "✗ Blog NOT running on localhost:3000 (HTTP: $HTTP_CODE)"
fi
```

**If Percy token is missing:** Stop and inform user to add token to `.env.local`.

**If blog is NOT running:** Stop and ask user if they want to start it:
- Ask: "Blog nie działa na localhost:3000. Czy chcesz, żebym go uruchomił? (pnpm build && pnpm start)"
- If yes, start the blog and wait for it to be ready before proceeding
- If no, stop the skill execution

### Step 2: Ask User Preferences

**Only proceed to this step if BOTH prerequisites are met.**

Ask user about browser mode:

1. **Browser mode**:
   - **Headed** (default) - visible browser, good for debugging
   - **Headless** - faster, for CI/CD

### Step 3: Run Percy Tests

**Headed mode (default):**
```bash
cd /storage1/denser/apps/blog
set -a && source .env.local && set +a && pnpm pw:percy:headed
```

**Headless mode:**
```bash
cd /storage1/denser/apps/blog
set -a && source .env.local && set +a && pnpm pw:percy
```

### Step 4: Parse Results

Percy outputs build URL at the end:
```
[percy] Finalized build #N: https://percy.io/.../builds/...
```

Extract and present this URL to the user.

### Step 5: Summary

Present results:

```
========================================
PERCY VISUAL TESTS SUMMARY
========================================
Tests: 8 total
Status: X passed, Y failed

Snapshots captured:
✓ Homepage - Light
✓ Homepage - Dark
✓ Profile Page - Light
✓ Profile Page - Dark
✓ Post Page - Light
✓ Post Page - Dark
✓ Community Page - Light
✓ Community Page - Dark

Percy Build: https://percy.io/.../builds/...
========================================

View visual diffs in Percy dashboard above.
```

## Test Catalog

| Page | Snapshots | Test File |
|------|-----------|-----------|
| Homepage | Light, Dark | homepage.visual.spec.ts |
| Profile (@gtg) | Light, Dark | profile.visual.spec.ts |
| Post (first from homepage) | Light, Dark | post.visual.spec.ts |
| Community (LeoFinance) | Light, Dark | community.visual.spec.ts |

## Configuration Files

| File | Purpose |
|------|---------|
| `apps/blog/percy.yml` | Percy config - viewport, CSS to hide dynamic elements |
| `apps/blog/playwright.percy.config.ts` | Playwright config for Percy |
| `apps/blog/playwright/tests/visual/*.spec.ts` | Visual test specs |

## Dynamic Content Handling

Percy config (`percy.yml`) hides elements that change between runs:

```yaml
percy-css: |
  [data-testid="post-card-timestamp"],
  [data-testid="healthchecker-indicator"] {
    visibility: hidden !important;
  }
  img[src*="/avatar/"] {
    opacity: 0 !important;
  }
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PERCY_TOKEN` | Percy API token from percy.io | Yes |
| `BASE_URL` | Target URL (default: localhost:3000) | No |

## Troubleshooting

### "Snapshot command was not called"
Blog app is not running. Start it with:
```bash
cd /storage1/denser/apps/blog
pnpm build && pnpm start
```

### "Percy token not found"
Add token to `.env.local`:
```bash
echo "PERCY_TOKEN=your_token_here" >> /storage1/denser/apps/blog/.env.local
```

### Tests pass but no snapshots uploaded
Check Percy token is valid and not expired at https://percy.io/settings

## Directories

| Path | Purpose |
|------|---------|
| Working directory | /storage1/denser/apps/blog |
| Visual tests | playwright/tests/visual/ |
| Percy config | percy.yml |
| Playwright config | playwright.percy.config.ts |
| Environment file | .env.local |
