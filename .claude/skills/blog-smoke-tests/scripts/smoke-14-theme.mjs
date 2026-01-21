/**
 * SMOKE-14: Theme Toggle
 * Priority: P4 (Additional)
 * Verifies theme toggle dropdown exists and changes theme
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-14';
const TEST_NAME = 'Theme Toggle';
const TEST_PRIORITY = 'P4';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  console.log('\n2. Checking current theme...');
  const htmlElement = page.locator('html');
  const initialClass = await htmlElement.getAttribute('class');
  const initialTheme = initialClass?.includes('dark') ? 'dark' : 'light';
  console.log(`   Current theme: ${initialTheme}`);

  console.log('\n3. Finding theme toggle button...');
  // Theme toggle is a dropdown with data-testid="theme-mode"
  const themeButton = page.locator('[data-testid="theme-mode"]').first();
  const buttonFound = await themeButton.isVisible().catch(() => false);

  if (buttonFound) {
    console.log('   ✓ Theme toggle button found');

    console.log('\n4. Clicking theme toggle to open dropdown...');
    await themeButton.click();

    // Wait for dropdown menu items - they have data-testid="theme-mode-item" with span text
    const targetTheme = initialTheme === 'light' ? 'Dark' : 'Light';
    const themeMenuItem = page.locator('[data-testid="theme-mode-item"]');

    try {
      await themeMenuItem.first().waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    } catch {
      // Menu may use different structure
    }

    const menuItemsCount = await themeMenuItem.count();
    console.log(`   Menu items found: ${menuItemsCount}`);

    if (menuItemsCount > 0) {
      console.log(`\n5. Selecting "${targetTheme}" theme...`);
      // Select target theme using span:text pattern like in homePage.ts
      const targetItem = page.locator(`[data-testid="theme-mode-item"] span:text("${targetTheme}")`);
      const targetExists = await targetItem.isVisible().catch(() => false);

      if (targetExists) {
        await targetItem.click();
        console.log(`   Clicked "${targetTheme}" option`);

        // Wait for theme class to change
        try {
          await page.waitForFunction(
            (initialCls) => {
              const currentClass = document.documentElement.getAttribute('class') || '';
              const currentTheme = currentClass.includes('dark') ? 'dark' : 'light';
              const wasTheme = (initialCls || '').includes('dark') ? 'dark' : 'light';
              return currentTheme !== wasTheme;
            },
            initialClass,
            { timeout: TIMEOUTS.TOOLTIP }
          );
        } catch {
          // Theme may take time to change
        }

        await page.waitForLoadState('domcontentloaded');

        const newClass = await htmlElement.getAttribute('class');
        const newTheme = newClass?.includes('dark') ? 'dark' : 'light';
        console.log(`   New theme: ${newTheme}`);

        if (initialTheme !== newTheme) {
          console.log('   ✓ PASS: Theme changed successfully');
        } else {
          console.log('   ✗ FAIL: Theme did not change after selection');
          allPassed = false;
        }
      } else {
        console.log(`   ✗ FAIL: "${targetTheme}" option not found in dropdown`);
        allPassed = false;
      }
    } else {
      console.log('   ✗ FAIL: No menu items in dropdown');
      allPassed = false;
    }
  } else {
    console.log('   ✗ FAIL: Theme toggle button not found');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));
