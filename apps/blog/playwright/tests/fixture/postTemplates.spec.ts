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
  submitPost,
  hbdAsset,
  readSeededPostTemplates,
  seedPostTemplates,
  expectPublishingPanelOptions,
  type SeededPostTemplate
} from '../support/postCreationContext';

/**
 * Post creation — Post Templates (§2.4 TPL-01..04).
 *
 * Templates are user-permanent localStorage entries keyed
 * `hivePostTemplates-{user}` (see `features/post-editor/advanced-settings-post-form.tsx`
 * and the StorageTTL.PERMANENT contract in `packages/ui/lib/storage-with-ttl.ts`).
 * The dialog's three transitions are exercised individually:
 *
 *   - TPL-01 drives the create flow through the UI (no seed) and asserts
 *     the new entry lands in localStorage with the saved fields, plus the
 *     duplicate-name guard re-firing on a second attempt at the same name.
 *   - TPL-02 seeds a template, opens the editor, loads it, and asserts the
 *     form fields and Publishing panel reflect the seeded payload.
 *   - TPL-03 seeds a template, deletes it from the dialog, and asserts both
 *     the rendered list and the localStorage entry are empty.
 *   - TPL-04 seeds a template carrying a non-default payout combination
 *     (custom max + 50/50 + one beneficiary — closest §2.3 analogue is
 *     PAY-09), loads it, publishes, and asserts the produced TX-01/TX-02
 *     pair carries those exact values. This is the only TPL spec that
 *     emits a broadcast — TPL-01/02/03 are pure client state.
 *
 * Fixture set: `postTemplates` overlays `postPayout` (which overlays
 * `postCreate`) with zero patches — template flows reuse the same RPC
 * surface as a vanilla /submit.html visit.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postTemplates
 */

test.use({ fixtureTestName: 'postTemplates', authenticatedUser: {} });

// Names used across the suite. Kept distinct so a leak between tests
// (e.g. a state-carry bug) surfaces as a wrong-name assertion failure
// rather than a silent overlap.
const TPL_01_NAME = 'TPL-01 fresh template';
const TPL_02_NAME = 'TPL-02 seeded template';
const TPL_03_NAME = 'TPL-03 template to delete';
const TPL_04_NAME = 'TPL-04 publish from template';

// Note on `category: 'blog'` (vs the more intuitive empty string): a real
// template saved through the UI inherits whatever the form's `category`
// field holds at save-time, which for a non-community post is the
// `use-post-form-state.ts` default 'blog'. On submit,
// `packages/transaction/index.ts:618` does
//   `category: category !== 'blog' ? category : tags[0]`
// — i.e. the literal 'blog' is the sentinel that means "use first tag as
// parent_permlink". Seeding the template with `category: ''` breaks that
// fallback (TX-01 gets `parent_permlink: ''`), so we seed the same
// sentinel the production save path produces.
const TPL_02_PAYLOAD: SeededPostTemplate = {
  templateTitle: TPL_02_NAME,
  title: 'TPL-02 loaded title',
  postArea: 'TPL-02 loaded body content',
  postSummary: 'TPL-02 loaded summary',
  tags: DEFAULT_TAG,
  author: '',
  category: 'blog',
  beneficiaries: [],
  maxAcceptedPayout: 1000000,
  payoutType: '50%'
};

// Custom 500 HBD + 50/50 + one beneficiary at 10% — matches the shape
// PAY-09 pins on the TX-02 wire (max=500, percent_hbd=10000, one bene
// at weight=1000 basis points). The interesting part of TPL-04 is that
// these values reach the broadcast *via the load path*, not by the user
// configuring the modal directly.
const TPL_04_BENEFICIARY = 'guest4test2';
const TPL_04_CUSTOM_HBD = 500;
const TPL_04_BENE_WEIGHT_PCT = 10;

const TPL_04_PAYLOAD: SeededPostTemplate = {
  templateTitle: TPL_04_NAME,
  title: 'TPL-04 publish from template',
  postArea: 'TPL-04 body content from template',
  postSummary: 'TPL-04 summary from template',
  tags: DEFAULT_TAG,
  author: '',
  category: 'blog',
  beneficiaries: [{ account: TPL_04_BENEFICIARY, weight: String(TPL_04_BENE_WEIGHT_PCT) }],
  maxAcceptedPayout: TPL_04_CUSTOM_HBD,
  payoutType: '50%'
};

test.describe('Post creation — post templates (§2.4)', () => {
  test('TPL-01: create a new template + duplicate-name guard', async ({ page }) => {
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    const modal = new AdvancedSettingsModal(page);

    // The form must hold at least an empty-default payout combination for
    // the save to be meaningful. We don't fill title/body/tags here — the
    // template captures whatever's currently in the form, and TPL-01 is
    // about the create transition itself, not the content payload (which
    // TPL-02 covers from the other side).
    await editor.getAdvancedSettingsButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.expectNoTemplatesMessage();

    await modal.saveAsNewTemplate(TPL_01_NAME);
    // onSave closes the dialog (advanced-settings-post-form.tsx:257).
    await expect(modal.advancedSettingsTitleElement).toBeHidden();

    // Source-of-truth assertion: the entry exists in localStorage with
    // the supplied title. We don't pin every field — the template inherits
    // the form's default empty state, which is uninteresting for §2.4.
    const stored = await readSeededPostTemplates(page);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.templateTitle).toBe(TPL_01_NAME);

    // UI-side cross-check: re-open the dialog, the new entry renders in
    // the list. Catches a regression that writes storage correctly but
    // fails to re-hydrate the list on next mount.
    await editor.getAdvancedSettingsButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.expectTemplateInList(TPL_01_NAME);

    // Duplicate-name guard (bonus over the wiki's TPL-01 scope, but
    // "free" once the dialog is open): typing the same name again flips
    // `isTemplateStored` true, surfacing the inline error and disabling
    // Save (advanced-settings-post-form.tsx:447-450, :465).
    await modal.fillTemplateName(TPL_01_NAME);
    await modal.expectTemplateNameTakenError();
    await modal.expectSaveDisabled();
  });

  test('TPL-02: load a seeded template into the editor', async ({ page }) => {
    await seedPostTemplates(page, [TPL_02_PAYLOAD]);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    const modal = new AdvancedSettingsModal(page);

    await editor.getAdvancedSettingsButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.expectTemplateInList(TPL_02_NAME);

    // Selecting an item reveals the Load button (currentTemplate truthy,
    // advanced-settings-post-form.tsx:475-478). Delete also surfaces, but
    // we don't act on it here.
    await modal.clickSpecificTemplate(TPL_02_NAME);
    await modal.expectLoadButtonVisible();
    await modal.loadSelectedTemplate();

    // loadTemplate() closes the dialog and emits a success toast
    // (advanced-settings-post-form.tsx:204-208). Wait on the toast as
    // the load-completed signal before reading form state.
    await expect(modal.advancedSettingsTitleElement).toBeHidden();
    await expect(page.getByText('Template loaded', { exact: true })).toBeVisible();

    // Form fields populated from the template.
    await expect(editor.getPostTitleInput).toHaveValue(TPL_02_PAYLOAD.title);
    await expect(editor.getPostSummaryInput).toHaveValue(TPL_02_PAYLOAD.postSummary);
    await expect(editor.getEnterYourTagsInput).toHaveValue(TPL_02_PAYLOAD.tags);
    // CodeMirror renders the body inside `.cm-content`; we assert
    // substring-containment so soft-wrapping / line-decoration noise
    // doesn't break the match.
    await expect(editor.getEditorContentTextarea).toContainText(TPL_02_PAYLOAD.postArea);

    // Publishing panel — for a no-limit + 50/50 payload the only line
    // rendered is "Author rewards: 50% HBD / 50% HP" (max-payout line is
    // hidden when value == 1_000_000). expectPublishingPanelOptions
    // also asserts the absent max-payout / beneficiaries lines.
    await expectPublishingPanelOptions(page, {
      maxPayout: 'no_max',
      payoutType: '50%'
    });
  });

  test('TPL-03: delete a seeded template', async ({ page }) => {
    await seedPostTemplates(page, [
      {
        ...TPL_02_PAYLOAD,
        templateTitle: TPL_03_NAME,
        title: 'TPL-03 (will be deleted)'
      }
    ]);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    const modal = new AdvancedSettingsModal(page);

    await editor.getAdvancedSettingsButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.expectTemplateInList(TPL_03_NAME);

    await modal.clickSpecificTemplate(TPL_03_NAME);
    await modal.expectDeleteButtonVisible();
    await modal.deleteSelectedTemplate();

    // deleteTemplate() does NOT close the dialog — it stays open with the
    // list re-rendered. Both surfaces are asserted: the rendered list
    // (no item, "No templates found" returned) and the underlying storage.
    await modal.expectTemplateNotInList(TPL_03_NAME);
    await modal.expectNoTemplatesMessage();
    expect(await readSeededPostTemplates(page)).toHaveLength(0);
  });

  test('TPL-04: publish a post from a loaded template (TX-01 + TX-02)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });

    await seedPostTemplates(page, [TPL_04_PAYLOAD]);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    const modal = new AdvancedSettingsModal(page);

    await editor.getAdvancedSettingsButton.click();
    await expect(modal.advancedSettingsTitleElement).toBeVisible();
    await modal.clickSpecificTemplate(TPL_04_NAME);
    await modal.loadSelectedTemplate();
    await expect(modal.advancedSettingsTitleElement).toBeHidden();
    await expect(page.getByText('Template loaded', { exact: true })).toBeVisible();

    // Pre-submit sanity: the publishing panel reflects the template's
    // custom max + 50/50 + 1 beneficiary settings before we hit Submit.
    // Catches a regression where `loadTemplate()` correctly seeds form
    // state but the panel reads stale values from elsewhere.
    await expectPublishingPanelOptions(page, {
      maxPayout: 'custom',
      customValue: TPL_04_CUSTOM_HBD,
      payoutType: '50%',
      beneficiaries: [
        { account: TPL_04_BENEFICIARY, weight: TPL_04_BENE_WEIGHT_PCT }
      ]
    });

    await submitPost(page);
    await broadcast.waitForCount(1);

    // TX-01: the comment carries the template's title (slugified into
    // the permlink) and the first-tag-as-parent-permlink convention.
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: DEFAULT_TAG,
      author: POST_AUTHOR,
      body: TPL_04_PAYLOAD.postArea,
      permlinkPattern: /tpl-04-publish-from-template/
    });

    // TX-02: payout combination round-trips template → form → wax.
    // Beneficiary weight is UI-percent × 100 (basis points); 10% → 1000.
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /tpl-04-publish-from-template/,
      max_accepted_payout: hbdAsset(TPL_04_CUSTOM_HBD),
      percent_hbd: 10000,
      beneficiaries: [
        { account: TPL_04_BENEFICIARY, weight: TPL_04_BENE_WEIGHT_PCT * 100 }
      ]
    });
  });
});
