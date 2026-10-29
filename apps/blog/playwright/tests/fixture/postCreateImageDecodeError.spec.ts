import { test, expect } from '../support/fixture-proxy-test';
import { installImageUploadStub } from '../support/fixture-auth/image-upload-stub';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Image upload of a file the browser cannot decode (§2.1 POST-08b).
 *
 * The file starts with PNG magic bytes, so the optimizer takes it for a PNG,
 * but the rest is garbage: createImageBitmap rejects with an InvalidStateError.
 * The user must see the translated explanation, not the raw DOMException, and
 * nothing may be uploaded.
 */

test.use({ fixtureTestName: 'postCreateImage', authenticatedUser: {} });

const UNDECODABLE_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('this is not image data'.repeat(8))
]);

test.describe('Post editor image upload of an undecodable file (§2.1)', () => {
  test('POST-08b: an undecodable image shows a translated toast, not the raw decode error', async ({ page }) => {
    const uploads = await installImageUploadStub(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();
    await expect(page.getByRole('checkbox', { name: 'Optimize images' })).toBeChecked();

    await editor.getImageFileInput.setInputFiles({
      name: 'broken.png',
      mimeType: 'image/png',
      buffer: UNDECODABLE_PNG
    });

    await expect(page.getByTestId('image-decode-error-message')).toHaveText(
      "This image couldn't be read. Try another file or turn off image optimization."
    );
    await expect(page.getByText('InvalidStateError')).toHaveCount(0);
    await expect(page.getByText('could not be decoded')).toHaveCount(0);
    await expect(editor.getEditorContentTextarea).toContainText('![broken.png](UPLOAD FAILED)');
    expect(uploads.count()).toBe(0);
  });
});
