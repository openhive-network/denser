import type { Page } from '@playwright/test';
import { LoginType } from '@smart-signer/types/common';
import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import {
  installImageUploadStub,
  TINY_PNG
} from '../support/fixture-auth/image-upload-stub';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  DEFAULT_TAG,
  expectNoBroadcast,
  fillPostBody,
  gotoSubmitLoggedIn
} from '../support/postCreationContext';

/**
 * Image upload guards in the post editor (§2.1 POST-19, POST-19b, POST-20).
 *
 * POST-19/19b: Peak Vault signs only string challenges, but the imagehoster
 * needs a signature over `ImageSigningChallenge` + the image bytes. The
 * editor refuses the upload with a toast naming the login method instead
 * of signing, and inserts no `![…](UPLOAD FAILED)` placeholder.
 *
 * POST-20: a body still holding an `(UPLOAD FAILED)` placeholder keeps
 * submit disabled, so the broken markup never reaches the chain.
 *
 * Reuses the `postCreateImage/` recording (same submit page, same user).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateImageUnavailable.spec
 */

test.use({ fixtureTestName: 'postCreateImage' });

const UPLOAD_UNAVAILABLE = /Image upload isn't available when signed in with PeakVault/;
const BODY = 'Body before upload.';

async function openEditorWithBody(page: Page): Promise<PostEditorPage> {
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, BODY);
  return editor;
}

test.describe('Post editor — image upload with Peak Vault (§2.1)', () => {
  test.use({ authenticatedUser: { loginType: LoginType.peakvault } });

  test('POST-19: attaching an image explains that upload is unavailable', async ({ page }) => {
    const uploads = await installImageUploadStub(page);
    const editor = await openEditorWithBody(page);

    await editor.getImageFileInput.setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG
    });

    await expect(page.getByText(UPLOAD_UNAVAILABLE).first()).toBeVisible();
    await expect(editor.getEditorContentTextarea).toHaveText(BODY);
    expect(uploads.count()).toBe(0);
  });

  test('POST-19b: dropping an image explains that upload is unavailable', async ({ page }) => {
    const uploads = await installImageUploadStub(page);
    const editor = await openEditorWithBody(page);

    const dataTransfer = await page.evaluateHandle((b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }));
      return dt;
    }, TINY_PNG.toString('base64'));
    await editor.getEditorContent.dispatchEvent('drop', { dataTransfer });

    await expect(page.getByText(UPLOAD_UNAVAILABLE).first()).toBeVisible();
    await expect(editor.getEditorContentTextarea).toHaveText(BODY);
    expect(uploads.count()).toBe(0);
  });
});

test.describe('Post editor — failed upload placeholder (§2.1)', () => {
  test.use({ authenticatedUser: {} });

  test('POST-20: an (UPLOAD FAILED) placeholder blocks submit until removed', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('POST-20 fixture-test failed upload');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await fillPostBody(page, 'Body ![shot.png](UPLOAD FAILED)');

    const hint = page.getByTestId('failed-upload-hint');
    await expect(hint).toBeVisible();
    await expect(editor.getSubmitPostButton).toBeDisabled();
    await editor.getPostTitleInput.press('Enter');
    await expectNoBroadcast(page, broadcast);

    await editor.getEditorContentTextarea.click({ force: true });
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('Body without the placeholder');

    await expect(hint).toBeHidden();
    await expect(editor.getSubmitPostButton).toBeEnabled();
  });
});
