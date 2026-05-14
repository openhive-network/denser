import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation,
  expectCommentOptionsOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { AdvancedSettingsModal } from '../support/pages/advancedSettingsModal';
import {
  POST_AUTHOR,
  DEFAULT_TAG,
  gotoSubmitLoggedIn,
  fillPostBody,
  submitPost,
  configureAdvancedSettings,
  expectPublishingPanelOptions,
  hbdAsset,
  waitForAutosaveFlushed,
  type AdvancedSettingsConfig
} from '../support/postCreationContext';

/**
 * Post creation — Payout & Rewards combinations, top-level posts
 * (§2.3 PAY-01..PAY-12). Each spec drives the Advanced settings dialog
 * to pin a specific combination of max_accepted_payout / percent_hbd /
 * beneficiaries, submits, and asserts the produced TX-02
 * (`comment_options_operation`) against the canonical mapping.
 *
 * The wax `BlogPostOperation` always emits TWO operations in one trx:
 *   - operations[0] = comment_operation (TX-01) — sanity-checked here
 *   - operations[1] = comment_options_operation (TX-02) — main subject
 *
 * Mapping reference (verified in code):
 *   data.maxAcceptedPayout ───× 1000 ──► NaiAsset.amount (HBD, precision 3)
 *   payoutType "50%"  ──► percent_hbd = 10000
 *   payoutType "100%" ──► percent_hbd = 0
 *   beneficiary UI %   ───× 100 ──► weight (basis points, sorted by account)
 *
 * Source-of-truth: apps/blog/features/post-editor/hooks/use-post-form-actions.ts
 * (lines 100, 104, 141-149) and advanced-settings-post-form.tsx
 * (lines 137-141, 349 for the Decline-Payout ↔ 50%-forced invariant).
 *
 * Fixture set: `postPayout` overlays `postCreate` with zero patches —
 * payout/rewards choices are client-only state, no new RPCs to record.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postPayout
 */

test.use({ fixtureTestName: 'postPayout', authenticatedUser: {} });

const DEFAULT_CUSTOM_HBD = 100;
const BENEFICIARY_A = 'guest4test2';
const BENEFICIARY_B = 'guest4test3';

test.describe('Post creation — payout & rewards combinations (§2.3, top-level)', () => {
  test('PAY-01: no limit + 50/50 + no beneficiaries', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    const title = 'PAY-01 fixture-test post';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, 'PAY-01 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'no_max',
      payoutType: '50%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      permlinkPattern: /pay-01-fixture-test-post$/
    });
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-01-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  test('PAY-02: no limit + 100% Power Up + no beneficiaries', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-02 fixture-test post');
    await fillPostBody(page, 'PAY-02 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'no_max',
      payoutType: '100%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-02-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 0,
      beneficiaries: []
    });
  });

  test('PAY-03: decline payout + 50/50 + no beneficiaries', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-03 fixture-test post');
    await fillPostBody(page, 'PAY-03 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: '0',
      payoutType: '50%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-03-fixture-test-post$/,
      max_accepted_payout: hbdAsset(0),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  /**
   * PAY-04 pins the documented invariant from advanced-settings-post-form.tsx:
   *
   *   1. Selecting Decline Payout (`maxPayout === '0'`) auto-forces
   *      rewards to '50%' via a useEffect (lines 137-141).
   *   2. Simultaneously, the 100% Power Up Checkbox is rendered with
   *      `disabled={maxPayout === '0'}` (line 349) so the user CANNOT
   *      flip it back to 100% without first leaving Decline Payout.
   *
   * The test asserts both the UI state (Checkbox `disabled` attribute) and
   * the resulting broadcast (`percent_hbd: 10000`, not 0). If a future
   * refactor either drops the disabled gate or loosens the 50% lock,
   * the broadcast value will diverge and this test fails — preventing
   * a regression that would let users encode an unreachable rewards
   * config that wax/Hive would otherwise reject downstream.
   */
  test('PAY-04: decline payout — 100% Power Up disabled, broadcast forced to 50%', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-04 fixture-test post');
    await fillPostBody(page, 'PAY-04 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    // Drive the UI manually here (not through `configureAdvancedSettings`)
    // because we want to interpose a UI-state assertion between selecting
    // Decline and saving. We still need the same autosave-flush guard the
    // helper uses — open the modal too soon and `handleLoadTemplate(data)`
    // on save will clobber the typed body (see waitForAutosaveFlushed).
    const modal = new AdvancedSettingsModal(page);
    await waitForAutosaveFlushed(page);
    await editor.getAdvancedSettingsButton.click();
    // See `configureAdvancedSettings` for why we click the `<label for>`
    // instead of the Checkbox: the Checkbox is `display:none`. The Label
    // is the visible surface and HTML5 synthesizes a click on the
    // labeled control on Label clicks.
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.maxPayoutOptionLabel('0').click();
    // PAY-04's invariant: the 100% PU Checkbox must be disabled once
    // Decline is selected. Asserted on the testid the Checkbox carries
    // (the Label itself doesn't reflect the disabled state).
    await expect(modal.authorRewardsType100Button).toBeDisabled();
    await modal.saveButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeHidden();

    // PUBLISHING panel mirrors the resolved state: Decline collapses both
    // the rewards branch and the payoutType differentiation into a single
    // "Decline Payout" line. We pass `payoutType: '50%'` to match the
    // forced post-Decline state (the modal's useEffect overrides any
    // would-be 100% selection), and the helper's Decline-first branch in
    // `expectPublishingPanelOptions` keys off `maxPayout === '0'` rather
    // than `payoutType`.
    await expectPublishingPanelOptions(page, {
      maxPayout: '0',
      payoutType: '50%'
    });

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-04-fixture-test-post$/,
      max_accepted_payout: hbdAsset(0),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  test('PAY-05: custom value (100 HBD) + 50/50 + no beneficiaries', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-05 fixture-test post');
    await fillPostBody(page, 'PAY-05 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'custom',
      customValue: DEFAULT_CUSTOM_HBD,
      payoutType: '50%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-05-fixture-test-post$/,
      max_accepted_payout: hbdAsset(DEFAULT_CUSTOM_HBD),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  /**
   * PAY-05b pins the editor's defensive coercion in
   * `features/post-editor/lib/utils.ts:116`:
   *
   *   case 'custom':
   *     return customValue === '0' ? 1000000 : Number(customValue);
   *
   * If a user picks Custom value AND types 0, the form's
   * `maxAcceptedPayout` becomes `1_000_000` (HBD), NOT `0` — i.e. the
   * post defaults to "no limit", not Decline Payout. Without this guard
   * a typo would silently turn a high-value post into a Decline, which
   * is irreversible after first payout.
   *
   * Downstream consequences (versus PAY-05 with customValue=100):
   *   - PUBLISHING > "Maximum Accepted Payout: ..." line is HIDDEN
   *     (resolved value 1_000_000 fails the `< 1000000` visibility gate
   *     in PostPublishingSection.tsx:82).
   *   - Broadcast carries default `comment_options`, so wax omits the
   *     entire `comment_options_operation` (see CommentOperation.finalize
   *     in wax — only pushed when deepEqual(defaults, opts) is false).
   *     `expectCommentOptionsOperation` handles this via its
   *     defaults-fallback branch.
   *
   * If the coercion is removed, this test fails on max_accepted_payout
   * = "0" instead of "1000000000", catching the regression.
   */
  test('PAY-05b: custom value 0 — coerced to "no limit", not Decline', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-05b fixture-test post');
    await fillPostBody(page, 'PAY-05b body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'custom',
      customValue: 0,
      payoutType: '50%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      permlinkPattern: /pay-05b-fixture-test-post$/
    });
    // Effective max = 1_000_000 HBD (coerced). Combined with default
    // percent_hbd / allow flags / no beneficiaries, the resulting
    // comment_options matches Hive defaults — wax may emit op[1] or
    // omit it; `expectCommentOptionsOperation` accepts both.
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-05b-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  test('PAY-06: custom value (100 HBD) + 100% Power Up + no beneficiaries', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-06 fixture-test post');
    await fillPostBody(page, 'PAY-06 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'custom',
      customValue: DEFAULT_CUSTOM_HBD,
      payoutType: '100%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-06-fixture-test-post$/,
      max_accepted_payout: hbdAsset(DEFAULT_CUSTOM_HBD),
      percent_hbd: 0,
      beneficiaries: []
    });
  });

  test('PAY-07: no limit + 50/50 + 1 beneficiary (10%)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-07 fixture-test post');
    await fillPostBody(page, 'PAY-07 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'no_max',
      payoutType: '50%',
      beneficiaries: [{ account: BENEFICIARY_A, weight: 10 }]
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-07-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 10000,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });

  test('PAY-08: no limit + 100% Power Up + 1 beneficiary (10%)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-08 fixture-test post');
    await fillPostBody(page, 'PAY-08 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'no_max',
      payoutType: '100%',
      beneficiaries: [{ account: BENEFICIARY_A, weight: 10 }]
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-08-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 0,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });

  test('PAY-09: custom (100 HBD) + 50/50 + 1 beneficiary (10%)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-09 fixture-test post');
    await fillPostBody(page, 'PAY-09 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'custom',
      customValue: DEFAULT_CUSTOM_HBD,
      payoutType: '50%',
      beneficiaries: [{ account: BENEFICIARY_A, weight: 10 }]
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-09-fixture-test-post$/,
      max_accepted_payout: hbdAsset(DEFAULT_CUSTOM_HBD),
      percent_hbd: 10000,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });

  test('PAY-10: custom (100 HBD) + 100% Power Up + 1 beneficiary (10%)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-10 fixture-test post');
    await fillPostBody(page, 'PAY-10 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: 'custom',
      customValue: DEFAULT_CUSTOM_HBD,
      payoutType: '100%',
      beneficiaries: [{ account: BENEFICIARY_A, weight: 10 }]
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-10-fixture-test-post$/,
      max_accepted_payout: hbdAsset(DEFAULT_CUSTOM_HBD),
      percent_hbd: 0,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });

  test('PAY-11: decline payout + 1 beneficiary (10%)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-11 fixture-test post');
    await fillPostBody(page, 'PAY-11 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    const settings: AdvancedSettingsConfig = {
      maxPayout: '0',
      payoutType: '50%',
      beneficiaries: [{ account: BENEFICIARY_A, weight: 10 }]
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-11-fixture-test-post$/,
      max_accepted_payout: hbdAsset(0),
      percent_hbd: 10000,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });

  /**
   * PAY-12 pins the alphabetical-sort invariant from
   * use-post-form-actions.ts:148. The user adds beneficiaries in the
   * order [B, A] (B before A), each with a non-zero weight; the editor
   * must reorder to [A, B] before broadcast — both because Hive's
   * comment_payout_beneficiaries requires it and because the sort is
   * an explicit step in the form-actions hook. A regression that
   * dropped the `.sort(...)` step would surface here as an order mismatch.
   */
  test('PAY-12: no limit + 50/50 + multiple beneficiaries (sorted alphabetically)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('PAY-12 fixture-test post');
    await fillPostBody(page, 'PAY-12 body content');
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);

    // Add B first (10%) then A (5%) — broadcast must reorder to [A, B].
    const settings: AdvancedSettingsConfig = {
      maxPayout: 'no_max',
      payoutType: '50%',
      beneficiaries: [
        { account: BENEFICIARY_B, weight: 10 },
        { account: BENEFICIARY_A, weight: 5 }
      ]
    };
    await configureAdvancedSettings(page, settings);
    // PUBLISHING line displays the *count* only ("Beneficiaries: 2 set"),
    // not the individual account names — sort/order doesn't surface
    // here, so the assertion is identical regardless of input order.
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-12-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 10000,
      beneficiaries: [
        { account: BENEFICIARY_A, weight: 500 },
        { account: BENEFICIARY_B, weight: 1000 }
      ]
    });
  });
});
