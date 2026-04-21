import { test } from '../support/fixture-proxy-test';
import { UserListPage } from '../support/pages/userListPage';

/**
 * User Lists fixture tests — Test Plan §1.5 (ANON-LIST-01..04).
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'userLists' });

const STABLE_USER = 'hiveio';
const USER_WITH_ENTRIES = 'hive.blog';
const USER_WITH_ENTRIES_BLACKLIST_COUNT = 8;

const listPages = [
  { id: 'ANON-LIST-01', slug: 'muted', title: /muted/i },
  { id: 'ANON-LIST-02', slug: 'blacklisted', title: /blacklist/i },
  { id: 'ANON-LIST-03', slug: 'followed_muted_lists', title: /follow.*muted/i },
  { id: 'ANON-LIST-04', slug: 'followed_blacklists', title: /follow.*blacklist/i }
];

test.describe('User Lists — anonymous view (§1.5)', () => {
  for (const { id, slug, title } of listPages) {
    test(`${id}: @${STABLE_USER}/lists/${slug} renders container or empty state`, async ({
      page
    }) => {
      const userList = new UserListPage(page);

      await userList.gotoListPage(STABLE_USER, slug);
      await userList.expectAreaVisible();
      await userList.expectTitleMatches(title);
      await userList.expectContainerOrEmpty();
      await userList.expectOwnerOnlySectionsHidden();
    });
  }

  test(`ANON-LIST-02 variant: @${USER_WITH_ENTRIES}/lists/blacklisted shows items`, async ({
    page
  }) => {
    const userList = new UserListPage(page);

    await userList.gotoListPage(USER_WITH_ENTRIES, 'blacklisted');
    await userList.expectAreaVisible();
    await userList.expectItemCount(USER_WITH_ENTRIES_BLACKLIST_COUNT);
  });
});
