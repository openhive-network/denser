import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  DEFAULT_TAG,
  gotoSubmitLoggedIn,
  fillPostBody,
  submitPost,
  expectNoBroadcast
} from '../support/postCreationContext';

/**
 * Post creation — validation / negative cases (§2.2 POST-V01..V11).
 *
 * All 11 cases share one fixture set: `postCreateValidation` overlays
 * `postCreate` with no extra files (just `_index.json` declaring the
 * base). None of these tests broadcast a successful comment_operation
 * — the submit button is either disabled by the form's button-gating
 * logic (validateXxx() returns a non-null string, or a required field
 * is empty) or, for Zod-only constraints that don't feed the gate
 * (e.g. summary max-length), the click triggers Zod which sets
 * `form.formState.errors` and short-circuits the submit handler.
 *
 * Two validation paths, two assertion shapes:
 *
 * - Button-disable path (V01/V02/V03/V06/V07/V08/V09/V10): assert the
 *   inline validator message (or the submit-requirements-hint when the
 *   field is still empty), assert the button has `disabled`, and
 *   assert no broadcast left the page over a settle window.
 *
 * - Click-then-Zod path (V05): button is enabled, we click submit,
 *   then assert the resulting FormMessage <p> appears and broadcast
 *   still didn't fire (handleSubmit aborts before transactionService).
 *
 * Documented-discrepancy cases (V04/V11): the wiki labels these as
 * "verify error" but the production form has no client-side rule that
 * would emit one. We test the actual behavior so future drift surfaces
 * — empty summary is accepted, alternate-author input is accepted —
 * with comments tying the divergence back to types.ts / utils.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateValidation
 */

test.use({ fixtureTestName: 'postCreateValidation', authenticatedUser: {} });

// Base inputs used to satisfy non-targeted fields so the test isolates
// exactly one failure mode at a time. The values themselves never reach
// the chain — broadcasts are asserted to be zero.
const VALID_TITLE = 'POST-V validation fixture title';
const VALID_BODY = 'POST-V validation fixture body content';
const VALID_TAG = DEFAULT_TAG;

test.describe('Post creation — validation (§2.2)', () => {
  test('POST-V01: empty title — submit disabled, hint visible', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    // Leave title empty; fill the other required fields so the only
    // failure mode is the missing title.
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);

    await expect(editor.getSubmitPostButton).toBeDisabled();
    await expect(editor.getSubmitRequirementsHint).toHaveText(
      'Enter a title to submit'
    );

    await expectNoBroadcast(page, broadcast);
  });

  /**
   * POST-V01b: companion to V01 covering the Zod side of the title rule.
   * Empty title (V01) trips the disable gate `!storedPost?.title`, but a
   * single character is truthy — the button is enabled and only Zod's
   * `title.min(2)` (types.ts:7) catches the short title at submit time
   * via FormMessage. Same negative outcome (no broadcast), different
   * UX surface; worth pinning so a future schema change doesn't silently
   * widen what counts as a valid title.
   */
  test('POST-V01b: 1-character title — Zod blocks submit, no broadcast', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill('a');
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);

    // 1-char title isn't falsy, so the disable gate doesn't latch and
    // no hint appears — handleSubmit has to run for the user to see
    // anything go wrong.
    await expect(editor.getSubmitRequirementsHint).toHaveCount(0);
    await expect(editor.getSubmitPostButton).toBeEnabled();
    await submitPost(page);

    await expect(
      page.locator('[data-testid="form-container"] p').filter({
        hasText: 'String must contain at least 2 character(s)'
      })
    ).toBeVisible();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V02: empty body — submit disabled, hint visible', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    // Body intentionally left empty.
    await editor.getEnterYourTagsInput.fill(VALID_TAG);

    await expect(editor.getSubmitPostButton).toBeDisabled();
    await expect(editor.getSubmitRequirementsHint).toHaveText(
      'Enter content to submit'
    );

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V03: empty tags (My Blog) — submit disabled, inline error + hint', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    // Tags intentionally left empty. `tagsRequired=true` because the
    // category is the default "blog" (not a community) — see post-form.tsx
    // `tagsRequired = !categoryParam && watchedValues.category === "blog"`.

    await expect(editor.getTagsErrorMessage).toHaveText(
      'Required when post to My Blog'
    );
    // PostMetadataSection.tsx:91 attaches `border-red-500` whenever
    // `tagsCheck` is truthy. Pair every inline-error assertion with the
    // visual cue so a styling refactor that drops one but keeps the
    // other surfaces here.
    await expect(editor.getEnterYourTagsInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();
    await expect(editor.getSubmitRequirementsHint).toHaveText(
      'Enter at least one tag to submit'
    );

    await expectNoBroadcast(page, broadcast);
  });

  /**
   * POST-V04: the wiki entry asks us to "verify error" on missing
   * summary, but `postSummary: z.string().max(140, …)` in types.ts
   * accepts empty input (no `.min()`), `validateSummaryInput("")`
   * returns null, and nothing in the button-disable gate references
   * summary length. So the form is happily submittable with no
   * summary at all. We assert that documented behavior — pin the
   * actual UX so a future "you must enter a summary" requirement
   * lands as a deliberate change rather than a silent regression.
   */
  test('POST-V04: empty summary — no error, submit stays enabled', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);
    // postSummary deliberately untouched (default empty string).

    await expect(editor.getSummaryErrorMessage).toHaveText('');
    // No validator fired → no `border-red-500` should be on the input.
    // Pinning the negative form because the wiki ambiguity around V04
    // means future contributors might assume the field SHOULD signal.
    await expect(editor.getPostSummaryInput).not.toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeEnabled();
    await expect(editor.getSubmitRequirementsHint).toHaveCount(0);

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V05: summary > 140 chars — Zod blocks submit, no broadcast', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);
    // 141 chars — one over the schema's max(140) bound.
    const longSummary = 'a'.repeat(141);
    await editor.getPostSummaryInput.fill(longSummary);

    // The counter is the immediate live signal: PostMetadataSection.tsx
    // toggles `text-red-500` once `field.value.length > 140`. We assert
    // both the displayed count and the red-text class so the test fails
    // loudly if either side of the live feedback breaks.
    await expect(editor.getSummaryCharCounter).toHaveText('141/140');
    await expect(editor.getSummaryCharCounter).toHaveClass(/text-red-500/);
    // Counterintuitively the summary input itself does NOT get a red
    // border in this case — the border toggle keys off `summaryCheck`
    // (markdown/HTML), not the Zod length rule. Asserting the negative
    // documents that gap; if the form is unified later so any error
    // paints the border, this flips and we update the assertion.
    await expect(editor.getPostSummaryInput).not.toHaveClass(/border-red-500/);

    // Summary max-length is Zod-only — not part of the disable gate.
    // The button stays enabled until handleSubmit fires and Zod blocks.
    await expect(editor.getSubmitPostButton).toBeEnabled();
    await submitPost(page);

    // FormMessage <p> is rendered by react-hook-form once the resolver
    // populates `errors.postSummary`. Match by text since FormMessage
    // doesn't expose a stable testid.
    await expect(
      page.locator('[data-testid="form-container"] p').filter({
        hasText: 'Maximum 140 characters'
      })
    ).toBeVisible();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V06: tag with special characters — inline error, submit disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    // Tag fails utils.ts:47 `!/^[a-z0-9-#]+$/.test(c)`. The earlier
    // uppercase guard (line 45) is not hit because the offender here
    // is `!`, not a letter.
    await editor.getEnterYourTagsInput.fill('hello!world');

    await expect(editor.getTagsErrorMessage).toHaveText(
      'Use only lowercase letters, digits and one dash'
    );
    await expect(editor.getEnterYourTagsInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V07: tag starting with a digit — inline error, submit disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    // `1abc` passes the lowercase / allowed-chars checks (utils.ts:45/47)
    // and falls through to the "must start with letter" guard at line 49.
    await editor.getEnterYourTagsInput.fill('1abc');

    await expect(editor.getTagsErrorMessage).toHaveText(
      'Must start with a letter'
    );
    await expect(editor.getEnterYourTagsInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V08: tag with uppercase letters — inline error, submit disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    // The uppercase guard (utils.ts:45) runs before the allowed-chars
    // and start-letter checks, so this short-circuits with a different
    // message even though `Hello` would also fail those.
    await editor.getEnterYourTagsInput.fill('Hello');

    await expect(editor.getTagsErrorMessage).toHaveText(
      'Use only lowercase letters'
    );
    await expect(editor.getEnterYourTagsInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V09: markdown in summary — inline error, submit disabled', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);
    // `*bold*` matches the leading `\*[\w\s]*\*` branch of the markdown
    // regex (utils.ts:64). Choose `*` rather than `_`/`~`/`#` so the
    // failure mode is the most idiomatic markdown surface a user might
    // type out of habit.
    await editor.getPostSummaryInput.fill('a *bold* summary');

    await expect(editor.getSummaryErrorMessage).toHaveText(
      'Markdown is not supported here'
    );
    await expect(editor.getPostSummaryInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  test('POST-V10: author with invalid characters — inline error, submit disabled', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);
    // `!` is outside `/^[\w.\d-]+$/` — utils.ts:74 — so the validator
    // emits the "must contain only letters and numbers" string and the
    // gate flips disabled. Note the displayed message is intentionally
    // narrower than the underlying regex (which also accepts `.` / `-`).
    await editor.getAuthorInput.fill('not!a!user');

    await expect(editor.getAuthorErrorMessage).toHaveText(
      'Must contain only letters and numbers'
    );
    await expect(editor.getAuthorInput).toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeDisabled();

    await expectNoBroadcast(page, broadcast);
  });

  /**
   * POST-V11: the wiki calls this a "negative case" but the client form
   * has no rule that rejects a syntactically-valid alternate author —
   * `validateAltUsernameInput` only checks the character class, and
   * nothing in the form cross-references the input against the logged-in
   * user. The actual block lives on the chain (the signed transaction's
   * author wouldn't match the posting authority and verify_authority
   * would reject), which the fixture-mode stub bypasses by construction.
   *
   * We test the observable client behavior: a different but valid author
   * value passes all client validators, the submit button is enabled,
   * and the field shows no inline error. If client-side enforcement is
   * added later, this test should flip to assert the new error.
   */
  test('POST-V11: alternate author (valid syntax) — no client-side block', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoSubmitLoggedIn(page);
    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    await editor.getPostTitleInput.fill(VALID_TITLE);
    await fillPostBody(page, VALID_BODY);
    await editor.getEnterYourTagsInput.fill(VALID_TAG);
    await editor.getAuthorInput.fill('someoneelse');

    await expect(editor.getAuthorErrorMessage).toHaveText('');
    // Same negative-form assertion as V04: client validator returned
    // null, so no red border should be on the field. Documents the
    // "no client-side block" contract visually as well as textually.
    await expect(editor.getAuthorInput).not.toHaveClass(/border-red-500/);
    await expect(editor.getSubmitPostButton).toBeEnabled();

    await expectNoBroadcast(page, broadcast);
  });
});
