import type { BrowserContext, Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import type { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { clickUntilOpen } from '../support/uiPrimitives';
import {
  answerKeyReferences,
  fillSignInForm,
  giveKeyRole,
  openAddAccountDialog,
  PAGE_WITH_HEADER,
  SIGN_IN_TIMEOUT_MS
} from '../support/safeStorageContext';

/**
 * The Blog's safe-storage sign-in shows the idle time the session locks after, the deployment's
 * (15 min, `APP_SESSION_TIME` unset) until the user picks another, and offers 5 min, 15 min, 1 h
 * and 8 h, nothing above the operator maximum (8 h, `APP_SESSION_TIME_MAX` unset). A pick is stored
 * when the sign-in submits: the hb-auth worker the session unlocks in is one started with it, named
 * in its URL, and the account menu shows it. The lock itself, after that idle time, is beekeeper's
 * (hb-auth); which worker, with which timeout, every app's pages use is covered by
 * packages/common-hiveio-packages/src/hb-auth/hbauth-service.test.ts, the resolution of the idle
 * time by packages/ui/lib/session-time.test.ts.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog stores
 * ACCOUNT in safe storage, as safeStorageDirectAuthority.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageIdleLock
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const WORKER_SCRIPT = /\/auth\/releasable-worker\.js\?/;

/** The URLs of the hb-auth worker scripts the context's pages load */
async function recordWorkerUrls(context: BrowserContext): Promise<string[]> {
  const urls: string[] = [];
  await context.route(WORKER_SCRIPT, (route) => {
    urls.push(route.request().url());
    return route.continue();
  });
  return urls;
}

/** The idle time the open sign-in form shows, waiting for the signing stack it loads first */
async function expectCaption(loginForm: LoginForm, text: string): Promise<void> {
  await expect(loginForm.loginDialog.getByTestId('session-time-caption')).toContainText(text, {
    timeout: SIGN_IN_TIMEOUT_MS
  });
}

async function pickSessionTime(page: Page, loginForm: LoginForm, seconds: number): Promise<void> {
  await loginForm.loginDialog.getByTestId('session-time-select').click();
  await page.getByTestId(`session-time-option-${seconds}`).click();
}

test.describe('Safe-storage idle lock', () => {
  test('BLOG-SAFE-STORAGE-IDLE-LOCK-01 — the sign-in shows the deployment idle time and offers nothing above the maximum', async ({
    page
  }) => {
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    // Two sentences: the idle time ends with its own full stop
    await expectCaption(loginForm, 'Locks after 15 min idle. Each signature restarts the timer.');
    await loginForm.loginDialog.getByTestId('session-time-select').click();

    await expect(page.getByRole('option')).toHaveText(['5 min', '15 min', '1 h', '8 h']);
  });

  test('BLOG-SAFE-STORAGE-IDLE-LOCK-02 — a sign-in with 1 h picked unlocks a worker locking after 1 h, shown in the account menu', async ({
    page,
    context
  }) => {
    const workerUrls = await recordWorkerUrls(context);
    // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await fillSignInForm(loginForm);
    await pickSessionTime(page, loginForm, 3600);
    await expectCaption(loginForm, 'Locks after 1 h idle');
    await loginForm.saveSignInButton.click();
    await loginForm.dismissBiometricPromptIfPresent();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });

    expect(workerUrls.at(-1)).toContain('idle=3600');
    const profileMenu = new ProfileUserMenu(page);
    await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
    await expect(profileMenu.profileMenuContent.getByTestId('session-time-note')).toHaveText('Locks after 1 h idle');
  });
});
