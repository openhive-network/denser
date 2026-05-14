import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { AdvancedSettingsModal } from '../support/pages/advancedSettingsModal';
import {
  DEFAULT_TAG,
  gotoSubmitLoggedIn,
  fillPostBody,
  expectNoBroadcast,
  waitForAutosaveFlushed
} from '../support/postCreationContext';

/**
 * Post creation — Payout & Rewards beneficiary validation (§2.3, negative).
 *
 * Companions to the PAY-01..PAY-15 happy-path suite, focused on the
 * beneficiary-row error gate in
 * `features/post-editor/advanced-settings-post-form.tsx:115-123`
 * (`getBeneficiaryError`). The save button is disabled by the same set
 * of predicates (`beneficiariesNames`, `smallWeight`, etc., lines 459-468),
 * so each negative case asserts BOTH the inline error string AND the
 * disabled save button — pair them so a styling refactor that drops one
 * surface but keeps the other surfaces here.
 *
 * Error-message priority order (top wins, advanced-settings-post-form.tsx:115):
 *   1. splitRewards < 0                  → "Your percent cannot be less than 0"
 *   2. hasDuplicateUsernames             → "Beneficiaries cannot be repeated"
 *   3. beneficiariesNames (length < 3)   → "Account name should be longer"   ← PAY-V01
 *   4. selfBeneficiary                   → "Cannot specify self as beneficiary"
 *   5. smallWeight (weight <= 0)         → "Beneficiary percentage must be from 1-100"   ← PAY-V02
 *   6. badActor                          → bad-actor message
 *
 * Both tests configure max=custom(100) + payoutType=100% to match the
 * documenting screenshots; the surrounding form values aren't relevant to
 * the validation logic but keep visual parity for anyone debugging via UI.
 *
 * Fixture set: `postPayoutValidation` overlays `postPayout` (which itself
 * overlays `postCreate`) with zero patches — these tests neither save
 * the modal nor submit, so no broadcast-class RPCs fire.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postPayoutValidation
 */

test.use({ fixtureTestName: 'postPayoutValidation', authenticatedUser: {} });

const VALID_TITLE = 'PAY-V validation fixture post';
const VALID_BODY = 'PAY-V validation fixture body';

/**
 * Open the Advanced settings dialog and set custom max payout (100 HBD)
 * + Power up 100% — the shared baseline both PAY-V01 and PAY-V02 build
 * on (matches the documenting screenshots). Returns the modal POM so
 * each spec can interact with the beneficiary controls and Save button
 * directly. We don't go through `configureAdvancedSettings` because
 * that helper always saves; these tests assert the Save button is
 * blocked and never click it.
 */
async function openModalWithCustomAndPowerUp(
  page: import('@playwright/test').Page,
  editor: PostEditorPage
): Promise<AdvancedSettingsModal> {
  const modal = new AdvancedSettingsModal(page);
  // Flush the postArea-debounce race before opening the modal — see
  // waitForAutosaveFlushed in postCreationContext.ts.
  await waitForAutosaveFlushed(page);
  await editor.getAdvancedSettingsButton.click();
  await expect(modal.advancedSettingsTitleElement).toBeVisible();
  await modal.maxPayoutOptionLabel('custom').click();
  await modal.customValueMaximumAcceptedPayoutInput.fill('100');
  await modal.payoutTypeOptionLabel('100%').click();
  return modal;
}

test.describe('Post creation — beneficiary validation (§2.3, negative)', () => {
  /**
   * PAY-V01: empty beneficiary account triggers
   * `beneficiariesNames = beneficiaries.some(b => b.account.length < 3)`
   * (line 105). The error message "Account name should be longer" wins
   * over the `smallWeight` check that the same row's default weight=0
   * would otherwise produce — see priority order in the file-level
   * comment.
   */
  test('PAY-V01: empty beneficiary account — "Account name should be longer", save disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const modal = await openModalWithCustomAndPowerUp(page, editor);

    // Add one beneficiary row, leave both fields untouched. The
    // `handleAddAccount` initialiser is `{weight: '0', account: ''}`,
    // so `account.length < 3` immediately, flipping beneficiariesNames true.
    await modal.addBeneficiarAccount.click();

    await expect(
      page.getByText('Account name should be longer', { exact: true })
    ).toBeVisible();
    await expect(modal.saveButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  /**
   * PAY-V02: valid account + weight=0 (or > 100) trips
   * `smallWeight = beneficiaries.find(e => Number(e.weight) <= 0)`
   * (line 111). Once the account length passes the >=3 gate, the next
   * predicate in priority order fires — "Beneficiary percentage must be
   * from 1-100". The message text is asymmetric vs the underlying check
   * (which only rejects <=0; the >100 side is enforced by the Input's
   * `max={100}` attribute on `beneficiary-item.tsx`), but the
   * user-facing copy is the same.
   */
  test('PAY-V02: beneficiary weight 0 — "Beneficiary percentage must be from 1-100", save disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const modal = await openModalWithCustomAndPowerUp(page, editor);

    // Add one beneficiary, fill account but leave weight at the default
    // '0'. With account.length >= 3 the higher-priority `beneficiariesNames`
    // gate clears, so we fall through to `smallWeight`.
    await modal.addBeneficiarAccount.click();
    await modal.addBeneficiarAccountNameInput.first().fill('guest4test2');
    // weight field intentionally left at default '0'.

    await expect(
      page.getByText('Beneficiary percentage must be from 1-100', { exact: true })
    ).toBeVisible();
    await expect(modal.saveButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });
});
