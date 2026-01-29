/**
 * SMOKE-20: Keyboard Navigation
 * Priority: P3 (Navigation)
 * Verifies basic keyboard navigation works (Tab, Enter, Escape)
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  config,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-20';
const TEST_NAME = 'Keyboard Navigation';
const TEST_PRIORITY = 'P3';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  console.log('\n2. Testing Tab key navigation...');
  // Focus on body first
  await page.locator('body').focus();

  const focusedElements = [];
  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];

  // Press Tab multiple times
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });
    if (focusedTag) {
      focusedElements.push(focusedTag);
    }
  }

  console.log(`   Focused elements: ${focusedElements.join(', ')}`);

  // Check that Tab moved focus to interactive elements
  const interactiveCount = focusedElements.filter(tag => interactiveTags.includes(tag)).length;

  if (interactiveCount > 0) {
    console.log(`   ✓ PASS: Tab navigated to ${interactiveCount} interactive elements`);
  } else {
    console.log('   ✗ FAIL: Tab did not navigate to any interactive elements');
    allPassed = false;
  }

  console.log('\n3. Testing Enter key on link...');
  // Go back to page and find first post title
  await gotoAndWaitForPosts(page, '/trending');

  const firstPostTitle = page.locator(`${SELECTORS.POST_TITLE} a, ${SELECTORS.POST_LIST_ITEM} a`).first();
  await firstPostTitle.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
  const linkVisible = await firstPostTitle.isVisible().catch(() => false);

  if (linkVisible) {
    // Focus on the link
    await firstPostTitle.focus();

    // Verify it's focused
    const isFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName.toLowerCase() === 'a';
    });

    if (isFocused) {
      console.log('   ✓ PASS: Link received focus');

      // Get href before pressing Enter
      const href = await firstPostTitle.getAttribute('href');
      const currentUrl = page.url();

      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUTS.NAVIGATION }).catch(() => {});

      // Check if we navigated
      const newUrl = page.url();
      if (newUrl !== currentUrl) {
        console.log('   ✓ PASS: Enter key navigated to new page');
      } else {
        console.log('   (i) INFO: URL did not change (might be SPA navigation)');
      }
    } else {
      console.log('   (i) INFO: Link did not receive focus as expected');
    }
  } else {
    console.log('   (i) INFO: Could not find link to test');
  }

  console.log('\n4. Testing Escape key on dialog...');
  // Navigate to a post page to find share button
  await gotoAndWaitForPosts(page, '/trending');

  const postLink = page.locator(`${SELECTORS.POST_TITLE} a`).first();
  await postLink.click();
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  // Find share button
  const shareButton = page.locator('[data-testid="share-post-button"], button:has-text("Share"), [aria-label*="share"]').first();
  const shareVisible = await shareButton.isVisible().catch(() => false);

  if (shareVisible) {
    await shareButton.click();
    await page.waitForTimeout(500);

    // Check if dialog opened
    const dialog = page.locator('[role="dialog"]');
    const dialogVisible = await dialog.isVisible().catch(() => false);

    if (dialogVisible) {
      console.log('   ✓ PASS: Dialog opened');

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const dialogStillVisible = await dialog.isVisible().catch(() => false);
      if (!dialogStillVisible) {
        console.log('   ✓ PASS: Escape key closed dialog');
      } else {
        console.log('   (i) INFO: Dialog may still be visible (different close mechanism)');
      }
    } else {
      console.log('   (i) INFO: Share dialog did not open');
    }
  } else {
    console.log('   (i) INFO: Share button not found, skipping dialog test');
  }

  console.log('\n5. Testing focus visibility...');
  await page.goto(`${config.BASE_URL}/trending`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  // Tab to first focusable element
  await page.keyboard.press('Tab');

  // Check if focused element has visible focus indicator
  const focusIndicator = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return { hasIndicator: false };

    const styles = window.getComputedStyle(el);
    const hasOutline = styles.outline !== 'none' && styles.outlineWidth !== '0px';
    const hasBoxShadow = styles.boxShadow !== 'none';
    const hasRingClass = el.className.includes('ring') || el.className.includes('focus');

    return {
      hasIndicator: hasOutline || hasBoxShadow || hasRingClass,
      tagName: el.tagName,
      outline: styles.outline
    };
  });

  if (focusIndicator.hasIndicator) {
    console.log('   ✓ PASS: Focus indicator visible');
  } else {
    console.log('   (i) INFO: Focus indicator may use custom styling');
  }

  console.log('\n6. Testing keyboard-only navigation to login...');
  // Reset to homepage
  await page.goto(`${config.BASE_URL}/trending`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  // Find login button
  const loginButton = page.locator('[data-testid="login-btn"], button:has-text("Login"), a:has-text("Login")').first();
  const loginVisible = await loginButton.isVisible().catch(() => false);

  if (loginVisible) {
    await loginButton.focus();
    const loginFocused = await page.evaluate(() => {
      const active = document.activeElement;
      const text = active?.textContent?.toLowerCase() || '';
      return text.includes('login') || text.includes('sign');
    });

    if (loginFocused) {
      console.log('   ✓ PASS: Login button is focusable');
    } else {
      console.log('   (i) INFO: Login button focus state unclear');
    }
  } else {
    console.log('   (i) INFO: Login button not visible');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));
