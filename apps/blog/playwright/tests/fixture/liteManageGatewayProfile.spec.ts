import { test, expect } from '../support/fixture-proxy-test';
import {
  NOTE_TEXT,
  OTHER_GATES,
  OTHER_GATEWAY_URL,
  ROOT,
  mockGateway,
  openPostAsItsAuthor,
  serveGateProfile
} from '../support/liteManageContext';

/**
 * The lite author of a post another gateway made, on a node serving `lite.get_profile`: the
 * `liteProfile` recording has the same post as `liteManage.spec.ts` and lists the method.
 *
 *   LITE-MANAGE-07  – the "posted through another gateway" note links the gate's `lite.gateway_url`
 *   LITE-MANAGE-07b – the note is unlinked when that is null
 */

test.use({ fixtureTestName: 'liteProfile' });

test('LITE-MANAGE-07: the note links the gate profile gateway_url', async ({ page }) => {
  await mockGateway(page, 'tombstone', OTHER_GATES);
  const asked = await serveGateProfile(page, ROOT.author, OTHER_GATEWAY_URL);
  await openPostAsItsAuthor(page);
  const note = page.getByTestId('comment-respons-header').getByTestId('lite-foreign-gateway-note');
  await expect(note.getByTestId('lite-foreign-gateway-link')).toHaveAttribute('href', OTHER_GATEWAY_URL);
  await expect(note).toHaveText(NOTE_TEXT);
  await expect(page.getByTestId('lite-edit')).toHaveCount(0);
  expect(asked).toContain(ROOT.author);
});

test('LITE-MANAGE-07b: the note is unlinked when the gate profile has no gateway_url', async ({ page }) => {
  await mockGateway(page, 'tombstone', OTHER_GATES);
  const asked = await serveGateProfile(page, ROOT.author, null);
  await openPostAsItsAuthor(page);
  const note = page.getByTestId('comment-respons-header').getByTestId('lite-foreign-gateway-note');
  await expect(note).toHaveText(NOTE_TEXT);
  await expect.poll(() => asked).toContain(ROOT.author);
  await expect(note.getByTestId('lite-foreign-gateway-link')).toHaveCount(0);
});
