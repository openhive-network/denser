import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';
import { PostPage } from './pages/postPage';

/**
 * Shared context for §5 Comments & Replies fixture specs. Mirrors
 * commentVotingContext.ts (same target post + login flow); diverges in
 * focus — these specs exercise comment creation/edit/delete flows
 * rather than vote operations.
 */

export const VOTER = process.env.CI_TEST_USER || 'guest4test';

/** Same post as §6.2 — saves on collateral fixture re-records. */
export const POST_COMMUNITY = 'hive-160391';
export const POST_AUTHOR = 'gtg';
export const POST_PERMLINK = 'hive-hardfork-25-jump-starter-kit';
export const POST_PATH = `/${POST_COMMUNITY}/@${POST_AUTHOR}/${POST_PERMLINK}/`;

/**
 * Identity of the comment injected by the variant generator into
 * `commenting_ownTopLevel/` (and `_ownNested/`). The spec uses these
 * to find the edit/delete button on guest4test's own card.
 */
export const OWN_COMMENT_AUTHOR = VOTER;
export const OWN_COMMENT_TOP_LEVEL_PERMLINK = 're-gtg-test-1';
export const OWN_COMMENT_NESTED_PERMLINK = 're-blocktrades-test-1';

export async function gotoPostLoggedIn(page: Page): Promise<void> {
  await page.goto(POST_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Locate any comment-list-item card by its `(author, permlink)`
 * identity, scoped via the timestamp-link href that comment-list-item
 * emits (`#@<a>/<p>`). Used as the building block for both "own
 * comment" lookups (variant fixtures inject under guest4test) and
 * "parent of a fresh nested reply" lookups (CMT-02).
 *
 * `.last()` is intentional: comment-list-item nests recursively
 * (parent contains nested replies as DOM descendants), so the
 * `filter({has: link})` predicate matches BOTH the deeper item that
 * owns the link AND every ancestor list-item that contains it as a
 * descendant. The deepest match comes last in document order, which
 * is the one we want.
 */
export function findCommentByIdent(
  postPage: PostPage,
  author: string,
  permlink: string
): Locator {
  return postPage.commentListItems
    .filter({
      has: postPage.page.locator(
        `[data-testid="comment-timestamp-link"][href="#@${author}/${permlink}"]`
      )
    })
    .last();
}

/**
 * Locate guest4test's own comment card. Variant generator injects
 * with `payout: 0` so the card sorts to the end under default
 * trending — we locate by identity, not position.
 */
export function findOwnComment(
  postPage: PostPage,
  permlink: string
): Locator {
  return findCommentByIdent(postPage, OWN_COMMENT_AUTHOR, permlink);
}

/**
 * Find a comment card anywhere in the list by its body text. Used to
 * verify optimistic-UI insertion in CMT-01 — the new comment lands in
 * `useCommentMutation.onMutate` cache update with `_optimistic: true`
 * before the broadcast resolves, so it appears in DOM regardless of
 * the replay fixture's bridge.get_discussion contents.
 */
export function findCommentCardByBody(
  postPage: PostPage,
  body: string
): Locator {
  return postPage.commentListItems.filter({ hasText: body }).first();
}

/**
 * Find a nested-reply card inside a given parent comment item. Used
 * in CMT-02: the optimistic reply attaches under the comment its
 * parent linkage points to (comment-list filters by
 * parent_author/parent_permlink, see comment-list.tsx L88-89).
 */
export function findNestedReplyByBody(
  postPage: PostPage,
  parentItem: Locator,
  body: string
): Locator {
  return parentItem.locator(postPage.commentListItem, { hasText: body }).first();
}

/** Edit button inside `findOwnComment(...)`. */
export function ownCommentEditButton(
  postPage: PostPage,
  permlink: string
): Locator {
  return findOwnComment(postPage, permlink).getByTestId(
    'comment-card-footer-edit'
  );
}

/** Reply button inside `findOwnComment(...)` (if/when needed). */
export function ownCommentReplyButton(
  postPage: PostPage,
  permlink: string
): Locator {
  return findOwnComment(postPage, permlink).getByTestId(
    'comment-card-footer-reply'
  );
}

/** Delete button inside `findOwnComment(...)`. */
export function ownCommentDeleteButton(
  postPage: PostPage,
  permlink: string
): Locator {
  return findOwnComment(postPage, permlink).getByTestId(
    'comment-card-footer-delete'
  );
}

/**
 * Click an edit/reply trigger and confirm the resulting `reply-editor`
 * opened. The visibility check uses an attribute-based signal —
 * `[data-testid="reply-editor"]` is rendered only inside the
 * `edit && parent_permlink && parent_author` branch of
 * comment-list-item, so its appearance is the positive confirmation
 * that the React state flip took effect.
 *
 * No `force: true`, no explicit timeouts: traces from job 3144190
 * show the previous `force: true` clicks were dispatched into a
 * hydration window where the button's DOM existed but its onClick
 * hadn't been (re)attached, so the click was lost. A plain `click()`
 * uses Playwright's auto-actionability (visible + stable layout +
 * hit-test) which polls until those preconditions hold — by the time
 * Playwright dispatches the click, React has settled, the handler is
 * wired, and `setEdit(true)` actually runs. `expect.toBeVisible()`
 * then auto-retries on the config-level `expect.timeout`, no per-call
 * override needed.
 */
export async function openReplyEditor(
  trigger: Locator,
  editorScope: Locator
): Promise<void> {
  await trigger.click();
  await expect(editorScope.first()).toBeVisible();
}

/**
 * The own comment's body description — used to verify edit-flow
 * optimistic UI: useUpdateCommentMutation.onMutate replaces the
 * comment's `body` in the React Query cache before the broadcast
 * resolves, so the new text surfaces in `comment-card-description`
 * immediately after submit.
 */
export function ownCommentDescription(
  postPage: PostPage,
  permlink: string
): Locator {
  return findOwnComment(postPage, permlink).locator(postPage.commentCard);
}

/**
 * The reply-editor instance scoped to the own comment card — used
 * to verify the editor closes after a successful edit submit
 * (`onSetReply(false)` is called in `postComment` success path).
 */
export function ownCommentEditor(
  postPage: PostPage,
  permlink: string
): Locator {
  return findOwnComment(postPage, permlink).getByTestId('reply-editor');
}

/**
 * The reply textbox for the post itself (not a comment). Different
 * trigger from comment-level reply: `[data-testid="comment-reply"]`
 * lives in the post action row.
 */
export function postReplyTrigger(page: Page): Locator {
  return page.getByTestId('comment-reply');
}

/**
 * Type into the open reply editor's CodeMirror surface. CM6 isn't a
 * real `<textarea>`, so `.fill()` doesn't work — focus the `.cm-content`
 * element and type via the keyboard.
 *
 * Edit mode preloads the existing comment body into the editor (see
 * reply-textbox.tsx `initialText = editMode ? commentBody : ''`), so
 * for edits pass `clearFirst: true` to wipe the buffer before typing,
 * otherwise the typed text appends.
 *
 * Pass `editor` to scope the `.cm-content` lookup to a specific
 * `reply-editor` instance (e.g. `ownCommentEditor(postPage, permlink)`).
 * The post-detail page can render multiple `reply-editor` elements
 * concurrently — one per comment in edit/reply state, plus the
 * post-level reply box — and a page-wide `.first()` may resolve to a
 * collapsed/hidden one and never satisfy the visibility wait. Job
 * 3138346 saw CMT-06 hit exactly that failure mode while CMT-03
 * (identical flow, sibling worker) passed.
 */
export async function typeIntoReplyEditor(
  page: Page,
  text: string,
  {
    clearFirst = false,
    editor
  }: { clearFirst?: boolean; editor?: Locator } = {}
): Promise<void> {
  const editorScope = editor ?? page.getByTestId('reply-editor');
  // The CM6 surface is the positive signal that MdEditor (loaded via
  // `next/dynamic({ssr: false})`) has finished its chunk fetch and
  // EditorView mount. `expect.toBeVisible` auto-retries on the
  // project-level `expect.timeout`, so no per-call override.
  const cm = editorScope.locator('.cm-content').first();
  await expect(cm).toBeVisible();
  // `force: true` skips the post-mount actionability re-check; a
  // hover-triggered toolbar Tooltip can briefly overlay `.cm-content`
  // and cause an unforced click to stall.
  await cm.click({ force: true });
  if (clearFirst) {
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
  }
  await page.keyboard.type(text);
}

/**
 * Click the reply editor's submit button. Translation-stable selector:
 * the only `redHover`-variant button in the editor is "Post" (or its
 * loading spinner).
 */
export async function submitReply(page: Page): Promise<void> {
  await page
    .getByTestId('reply-editor')
    .getByRole('button', { name: 'Post', exact: true })
    .click();
}
