import { Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Takes a Percy snapshot of the current page state.
 * @param page - Playwright Page object
 * @param name - Unique name for the snapshot
 * @param options - Optional Percy snapshot options
 */
export async function takePercySnapshot(page: Page, name: string, options?: { scope?: string }) {
  await percySnapshot(page, name, options);
}

/**
 * Takes Percy snapshots in both light and dark themes.
 * @param page - Playwright Page object
 * @param baseName - Base name for the snapshots (will append " - Light" and " - Dark")
 * @param changeTheme - Function to change the theme mode
 * @param options - Optional Percy snapshot options
 */
export async function takeThemeSnapshots(
  page: Page,
  baseName: string,
  changeTheme: (mode: 'Light' | 'Dark') => Promise<void>,
  options?: { scope?: string }
) {
  // Light mode snapshot
  await changeTheme('Light');
  await page.waitForTimeout(500); // Wait for theme transition
  await takePercySnapshot(page, `${baseName} - Light`, options);

  // Dark mode snapshot
  await changeTheme('Dark');
  await page.waitForTimeout(500);
  await takePercySnapshot(page, `${baseName} - Dark`, options);
}
