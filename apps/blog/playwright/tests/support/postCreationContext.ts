import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';
import { AdvancedSettingsModal } from './pages/advancedSettingsModal';
import type { BroadcastInterceptor } from './fixture-auth/broadcast-interceptor';

/**
 * NaiAsset NAI for HBD. Wax encodes max_accepted_payout as
 * { amount, precision: 3, nai: HBD_NAI }; the editor's `* 1000` step
 * converts whole-HBD UI values to milli-HBD before broadcast.
 */
export const HBD_NAI = '@@000000013';

/**
 * Build the NaiAsset shape `comment_options.max_accepted_payout` carries
 * on the wire, given the UI's "HBD whole units" value. Centralised so
 * §2.3 specs don't each redefine the encoding.
 */
export function hbdAsset(hbdWholeUnits: number) {
  return {
    amount: String(hbdWholeUnits * 1000),
    precision: 3,
    nai: HBD_NAI
  };
}

/**
 * Settle helper for negative-path specs. Races the interceptor's existing
 * `waitForCount(1, windowMs)` poller against an inactivity window:
 *
 *   - If a broadcast lands inside the window, `waitForCount` resolves
 *     (no throw, `.catch()` does nothing), `calls.length >= 1`, and the
 *     `toHaveLength(0)` assertion fails fast with a useful diagnostic.
 *   - If nothing lands, `waitForCount` throws on its deadline (caught and
 *     swallowed) and the assertion passes against the empty array.
 *
 * Net effect vs the old `waitForTimeout(300)`: surprise broadcasts surface
 * within ~50 ms (the poller's tick) instead of after the full window. The
 * window is still the upper bound on the success path — fundamentally
 * unavoidable for a "no event will fire" assertion — but we no longer
 * unconditionally sleep, and the wait re-uses the interceptor's existing
 * polling infrastructure rather than carrying its own duration constant.
 */
export async function expectNoBroadcast(
  _page: Page,
  broadcast: BroadcastInterceptor,
  windowMs: number = 300
): Promise<void> {
  await broadcast.waitForCount(1, windowMs).catch(() => {});
  expect(broadcast.calls, 'no broadcast should have fired').toHaveLength(0);
}

/**
 * Shared context for §2.1 Basic Post Creation fixture specs. Mirrors the
 * structure of commentingContext.ts / postVotingContext.ts — a single
 * source of truth for the seeded user, target routes, and editor-typing
 * helpers used by every POST-NN spec.
 *
 * Why a separate context (rather than reusing commentingContext): post
 * creation starts from /submit.html (or a community trending page),
 * never from a post-detail page, and produces a top-level
 * comment_operation (parent_author=''), so the constants don't overlap.
 */

export const POST_AUTHOR = process.env.CI_TEST_USER || 'guest4test';

/** Top-level submit form — POST-01, POST-02, POST-06. */
export const SUBMIT_PATH = '/submit.html';

/**
 * Community used by POST-03. Same id as the one already pinned by §5/§6.2
 * fixtures so we don't grow the fixture footprint with a new community
 * registration.
 */
export const POST_COMMUNITY = 'hive-160391';

/**
 * Default tag for non-community posts. `parent_permlink` in the produced
 * comment_operation is the FIRST tag (or `category` from the URL when
 * posting in a community), so this string ends up asserted in TX-01.
 * Keep it short and lowercase to satisfy the editor's tag validator.
 */
export const DEFAULT_TAG = 'test';

/**
 * Navigate to /submit.html as the seeded user. Mirrors
 * gotoPostLoggedIn from commentingContext.ts: waits for hydration via
 * the login-btn-hidden signal so subsequent interactions don't race
 * the initial render.
 */
export async function gotoSubmitLoggedIn(page: Page): Promise<void> {
  await page.goto(SUBMIT_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Land on the post editor pre-targeted to the community used by POST-03.
 * Reproduces the end-state of clicking "New Post" on the community page,
 * which does two things in `new-post-button.tsx`:
 *   1. onClick stores `postData-new-<user>` in localStorage with
 *      `category: <community>` (TTL-wrapped via setStorageItem)
 *   2. <Link> navigates to `/submit.html?category=<community>`
 *
 * We seed (1) directly via page.evaluate and then goto (2). A live
 * click-through is layout-fragile: the button is rendered both in
 * `community-info-sidebar` (xl+) and `community-simple-description-sidebar`
 * (md..lg) and the visible instance depends on viewport AND
 * `useUserClient` hydration timing — neither is worth defending in a
 * fixture that exists to validate the broadcast, not the navigation.
 *
 * URL alone doesn't reach the form's category field reliably:
 * `useSearchParams()` initial value can be undefined during the first
 * render that `usePostFormState` memoises, so the form picks up
 * `storedPost.category` (defaulting to 'blog') before
 * `categoryParam='hive-160391'` arrives. Seeding storedPost first wins
 * regardless of the timing.
 */
export async function gotoCommunityNewPostLoggedIn(page: Page): Promise<void> {
  // Land on the origin once so localStorage exists for the seeded user.
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(
    ([user, community, ttlMs]) => {
      const key = `postData-new-${user}`;
      const now = Date.now();
      const draft = {
        title: '',
        postArea: '',
        postSummary: '',
        tags: '',
        author: '',
        category: community,
        beneficiaries: [],
        maxAcceptedPayout: 1000000,
        payoutType: '50%'
      };
      // Mirror @ui/lib/storage-with-ttl setStorageItem layout: a wrapper
      // with `value`, `expiresAt` (now + ttl) and `createdAt`.
      window.localStorage.setItem(
        key,
        JSON.stringify({
          value: draft,
          expiresAt: now + ttlMs,
          createdAt: now
        })
      );
    },
    [POST_AUTHOR, POST_COMMUNITY, 30 * 24 * 60 * 60 * 1000]
  );

  await page.goto(`${SUBMIT_PATH}?category=${POST_COMMUNITY}`, {
    waitUntil: 'domcontentloaded'
  });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  await expect(page.getByTestId('post-title-input')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Wait until the typed post body has reached localStorage's
 * `postData-new-{user}` draft. The editor's debounce chain is:
 *
 *   - keystroke           → `latestPostAreaRef` (immediate)
 *   - keystroke + 300 ms  → `form.setValue('postArea', body)` (postArea
 *                            debounce in use-post-form-actions.ts:75)
 *   - form change + 500 ms→ `storePost(watchedValues)` writes localStorage
 *                            (auto-save debounce, lines 83-90)
 *
 * The Advanced-settings modal's `onSave` runs `handleLoadTemplate(data)`
 * which reads the form's `data.postArea` prop snapshotted at modal-open
 * time — NOT the live editor ref. If the form hasn't synced yet, save
 * clobbers the body to '' and the submit button stays disabled.
 *
 * localStorage is downstream of form state, so a positive read here
 * guarantees `form.postArea === body` too. Slightly slower than checking
 * form state directly (~500 ms vs ~300 ms), but event-driven and
 * deterministic — replaces a magic-number `waitForTimeout(350)` that
 * the project explicitly drove out of CMT helpers (commit 0356f9).
 */
async function waitForBodyPersisted(page: Page, body: string): Promise<void> {
  await page.waitForFunction(
    ({ author, expected }) => {
      const raw = window.localStorage.getItem(`postData-new-${author}`);
      if (!raw) return false;
      try {
        const wrapper = JSON.parse(raw);
        return wrapper?.value?.postArea === expected;
      } catch {
        return false;
      }
    },
    { author: POST_AUTHOR, expected: body }
  );
}

/**
 * Type into the post body's CodeMirror surface and wait for the typed
 * value to settle into the form / localStorage chain. CM6 is a
 * contenteditable div, not a textarea — `.fill()` doesn't apply. Same
 * dance as typeIntoReplyEditor in commentingContext.ts, but scoped to
 * the single editor on /submit.html (no nested reply-editor instances
 * to disambiguate).
 *
 * `force: true` skips the actionability re-check; toolbar tooltips can
 * briefly overlay .cm-content during hover and stall an unforced click
 * (see CMT-06 flake history).
 *
 * The trailing `waitForBodyPersisted` flushes the editor's debounce
 * chain so callers (notably the AdvancedSettingsModal flow) don't need
 * a fixed `waitForTimeout(350)` to dodge the postArea-debounce race —
 * see waitForBodyPersisted's docstring for the chain.
 */
export async function fillPostBody(page: Page, body: string): Promise<void> {
  const cm = page.locator('div.cm-editor').locator('.cm-content').first();
  await cm.waitFor({ state: 'visible', timeout: 30_000 });
  await cm.click({ force: true });
  await page.keyboard.type(body);
  await waitForBodyPersisted(page, body);
}

/**
 * Click the editor's submit button. Waits for the button to be enabled
 * first — the submit gate in post-form.tsx keys off `storedPost` (the
 * localStorage-persisted draft, debounced 500 ms behind form state), so
 * a click immediately after a modal save can race the autosave effect
 * that ferries form changes into storedPost. Polling for `:enabled` is
 * event-driven (Playwright auto-retries on the project expect timeout)
 * and beats a fixed waitForTimeout.
 */
export async function submitPost(page: Page): Promise<void> {
  const submitButton = page.locator('[data-testid="submit-post-button"]');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
}

/**
 * Advanced-settings dialog configuration used by §2.3 PAY-xx specs.
 *
 * - `maxPayout: 'no_max'` → `data.maxAcceptedPayout = 1000000`
 *   (NaiAsset amount `"1000000000"` after the editor's `* 1000` step)
 * - `maxPayout: '0'` → `data.maxAcceptedPayout = 0` (NaiAsset `"0"`).
 *   Also auto-forces rewards to `50%` and disables the `100%` Checkbox
 *   (advanced-settings-post-form.tsx:137-141, :349).
 * - `maxPayout: 'custom'` → requires `customValue` (HBD whole units);
 *   the editor multiplies it by 1000 for the broadcast NaiAsset.
 *
 * `payoutType` maps to broadcast `percent_hbd`:
 *   `'50%'` → 10000 ; `'100%'` → 0.
 *
 * `beneficiaries[]` carry UI-percent weights (1..100). The editor
 * multiplies each by 100 (basis points), drops zero-weights, and sorts
 * by account before broadcast — assertions in
 * `expectCommentOptionsOperation` expect that final, sorted shape.
 */
export interface AdvancedSettingsConfig {
  maxPayout: 'no_max' | '0' | 'custom';
  customValue?: number;
  payoutType: '50%' | '100%';
  beneficiaries?: { account: string; weight: number }[];
}

/**
 * Open the Advanced settings dialog, apply the requested combination,
 * and save. The dialog's `onSave()` calls `updateForm(...)` on the
 * parent post form, after which the submit button broadcasts with the
 * new payout/rewards baked in. We rely on the existing POM
 * (`AdvancedSettingsModal`) for locators — only the orchestration is
 * §2.3-specific.
 *
 * Notes on quirks the dialog adds:
 *   - The Checkbox primitives are visually hidden (`className="hidden"`)
 *     but their `<Label>` siblings carry `cursor-pointer` and are the
 *     interactive surface; we click the Label-wrapping testid container
 *     via the existing POM locators which target the (hidden) Checkbox.
 *     Playwright dispatches a click event that bubbles through the Label
 *     wrap, so `onCheckedChange` fires.
 *   - When `maxPayout === '0'`, the 100% PU Checkbox is `disabled` and
 *     rewards are forced to 50% on a `useEffect`. Callers that want
 *     `payoutType: '100%'` together with Decline should expect that
 *     forcing — PAY-04 asserts the disabled state instead of trying to
 *     beat the gate.
 */
export async function configureAdvancedSettings(
  page: Page,
  config: AdvancedSettingsConfig
): Promise<void> {
  const modal = new AdvancedSettingsModal(page);

  // Note: the 300 ms postArea debounce that races modal-save (described
  // in waitForBodyPersisted) is already flushed by `fillPostBody` before
  // we land here, so we don't need a second wait — open the modal directly.
  await page.locator('[data-testid="advanced-settings-button"]').click();
  // Wait on the DialogTitle (visible). We deliberately do NOT call the
  // POM's `validateAdvancedSettingsModalIsLoaded` here because it asserts
  // visibility on the max-payout / rewards Checkboxes — those carry
  // `className="hidden"` (display:none), so they're never visible. The
  // POM check would always time out on a healthy dialog.
  await expect(modal.advancedSettingsTitleElement).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });

  // The Checkbox primitives carry `className="hidden"` (display:none) —
  // they're not directly clickable in any Playwright mode. The visible
  // interactive surface is the `<Label htmlFor>` sibling, exposed via
  // POM helpers `maxPayoutOptionLabel` / `payoutTypeOptionLabel`.

  // Max payout: order matters — switching to '0' triggers the useEffect
  // that resets rewards to '50%', so apply max payout before payout type
  // and let PAY-04 assert the side effect explicitly.
  if (config.maxPayout === 'custom') {
    await modal.maxPayoutOptionLabel('custom').click();
    if (config.customValue === undefined) {
      throw new Error('customValue is required when maxPayout is "custom"');
    }
    await modal.customValueMaximumAcceptedPayoutInput.fill(String(config.customValue));
  } else {
    await modal.maxPayoutOptionLabel(config.maxPayout).click();
  }

  // Rewards: when maxPayout is Decline ('0'), BOTH rewards Checkboxes
  // carry `disabled={maxPayout === '0'}` (advanced-settings-post-form.tsx:349)
  // and rewards is auto-forced to '50%' via a useEffect. Playwright treats
  // a `<label for>` as disabled when its target is disabled, so any click
  // attempt on the rewards Labels times out. Skip the click entirely —
  // the resulting form state is correct (50% forced) for both 'payoutType'
  // values the caller might pass, and PAY-04 asserts the disabled gate
  // separately.
  if (config.maxPayout !== '0') {
    await modal.payoutTypeOptionLabel(config.payoutType).click();
  }

  // Beneficiaries: each "Add account" click appends a fresh
  // `{weight: '0', account: ''}` row rendered by the Beneficiary
  // component. All added rows share the same testids
  // (`beneficiary-value` / `beneficiary-name`) and are disambiguated by
  // `.nth(i)`. The "self" row above (showing splitRewards + the logged-in
  // user) carries no testids — it's a display-only summary, not editable.
  const beneficiaries = config.beneficiaries ?? [];
  for (let i = 0; i < beneficiaries.length; i++) {
    await modal.addBeneficiarAccount.click();
    await modal.addBeneficiarAccountNameInput.nth(i).fill(beneficiaries[i].account);
    await modal.addBeneficiarAccountValueInput
      .nth(i)
      .fill(String(beneficiaries[i].weight));
  }

  await modal.saveButton.click();
  // Dialog closes on save; wait for the title to disappear so subsequent
  // form interactions don't race the still-open modal.
  await expect(modal.advancedSettingsTitleElement).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Assert the PUBLISHING > Post options panel renders the three lines
 * consistent with the supplied advanced-settings config:
 *
 *   1. "Maximum Accepted Payout: <N> HBD" — only when
 *      `0 < maxAcceptedPayout < 1000000` (i.e. custom value).
 *      `no_max` (1_000_000) and Decline (0) both omit the line.
 *      Source: PostPublishingSection.tsx:82-87.
 *
 *   2. "Beneficiaries: <N> set" — only when beneficiaries[].length > 0.
 *      Source: PostPublishingSection.tsx:89-95.
 *
 *   3. "Author rewards:<X>" — always rendered, with X resolved as:
 *        - " Decline Payout" if maxAcceptedPayout === 0
 *        - " Power up 100%"  if payoutType === '100%'
 *        - " 50% HBD / 50% HP" otherwise
 *      Note the Decline branch SHORT-CIRCUITS the payoutType check, which
 *      matches the modal's useEffect that auto-forces rewards to '50%'
 *      when Decline is selected — the UI shows "Decline Payout" instead
 *      of the underlying-but-irrelevant '50% HBD / 50% HP'.
 *      Source: PostPublishingSection.tsx:97-104, with testid
 *      `author-rewards-description`.
 *
 * Call this BEFORE submit — it exercises the live form/UI rendering
 * loop independent of the broadcast assertion, so a regression that
 * mis-renders the panel (without breaking the broadcast) still surfaces.
 */
export async function expectPublishingPanelOptions(
  page: Page,
  config: AdvancedSettingsConfig
): Promise<void> {
  // Author rewards: Decline trumps payoutType in the rendered line.
  let rewardsText: string;
  if (config.maxPayout === '0') {
    rewardsText = 'Author rewards: Decline Payout';
  } else if (config.payoutType === '100%') {
    rewardsText = 'Author rewards: Power up 100%';
  } else {
    rewardsText = 'Author rewards: 50% HBD / 50% HP';
  }
  await expect(page.getByTestId('author-rewards-description')).toHaveText(rewardsText);

  // Max Accepted Payout line — only when the resolved form value sits
  // strictly between 0 and 1_000_000. The editor's `maxAcceptedPayout()`
  // helper (`features/post-editor/lib/utils.ts:109`) maps:
  //   - 'no_max' → 1_000_000 (line hidden, equality breaks `< 1000000`)
  //   - '0'      → 0          (line hidden, equality breaks `> 0`)
  //   - 'custom', customValue === '0' → 1_000_000 (defensive coercion;
  //                                                hidden, same as no_max)
  //   - 'custom', customValue ∈ (0, 1_000_000) → customValue (LINE SHOWN)
  // So `custom + 0` is semantically "no limit" downstream, NOT Decline —
  // see PAY-05b which pins that quirk. The Decline path lives behind the
  // distinct '0' (zero) maxPayout option.
  const isCustomLineShown =
    config.maxPayout === 'custom' &&
    config.customValue !== undefined &&
    config.customValue > 0 &&
    config.customValue < 1000000;

  if (isCustomLineShown) {
    await expect(
      page.getByText(`Maximum Accepted Payout: ${config.customValue} HBD`, {
        exact: true
      })
    ).toBeVisible();
  } else {
    // Assert the line is absent for no_max / Decline / custom-zero cases.
    // The text pattern is scoped enough that we expect zero matches anywhere
    // on the page.
    await expect(
      page.getByText(/^Maximum Accepted Payout:/)
    ).toHaveCount(0);
  }

  // Beneficiaries line — only when at least one was added.
  const beneficiariesCount = config.beneficiaries?.length ?? 0;
  if (beneficiariesCount > 0) {
    await expect(
      page.getByText(`Beneficiaries: ${beneficiariesCount} set`, { exact: true })
    ).toBeVisible();
  } else {
    await expect(page.getByText(/^Beneficiaries:/)).toHaveCount(0);
  }
}
