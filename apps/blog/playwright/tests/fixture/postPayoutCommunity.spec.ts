import { test } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation,
  expectCommentOptionsOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  POST_AUTHOR,
  POST_COMMUNITY,
  gotoCommunityNewPostLoggedIn,
  fillPostBody,
  submitPost,
  configureAdvancedSettings,
  expectPublishingPanelOptions,
  hbdAsset,
  type AdvancedSettingsConfig
} from '../support/postCreationContext';

/**
 * Post creation — Payout & Rewards combinations, community context
 * (§2.3 PAY-13..PAY-15). Same `comment_options_operation` (TX-02)
 * assertions as `postPayout.spec.ts`, but the post lands in a community
 * (`hive-160391`) instead of the user's blog — so `parent_permlink` on
 * the comment_operation is the community id, not the first tag. The
 * payout/rewards mapping is unchanged.
 *
 * Why a separate spec file: `fixtureTestName` is worker-scoped, so
 * community vs non-community must live in distinct files (different
 * overlay bases). See the §2.1 split between postCreate.spec.ts and
 * postCreateInCommunity.spec.ts for the same reason.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postPayoutCommunity
 */

test.use({ fixtureTestName: 'postPayoutCommunity', authenticatedUser: {} });

const DEFAULT_CUSTOM_HBD = 100;
const BENEFICIARY_A = 'guest4test2';

test.describe('Post creation — payout & rewards combinations (§2.3, community)', () => {
  test('PAY-13: no limit + 50/50 + no beneficiaries (in community)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityNewPostLoggedIn(page);
    const editor = new PostEditorPage(page);

    const title = 'PAY-13 fixture-test post';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, 'PAY-13 body content');
    // Tags are optional for community posts (tagsRequired = !categoryParam
    // && category === 'blog'), but we add one to mirror real-world usage.
    await editor.getEnterYourTagsInput.fill('test');

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
      parent_permlink: POST_COMMUNITY,
      author: POST_AUTHOR,
      permlinkPattern: /pay-13-fixture-test-post$/
    });
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-13-fixture-test-post$/,
      max_accepted_payout: hbdAsset(1000000),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  test('PAY-14: decline payout + 50/50 + no beneficiaries (in community)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityNewPostLoggedIn(page);
    const editor = new PostEditorPage(page);

    await editor.getPostTitleInput.fill('PAY-14 fixture-test post');
    await fillPostBody(page, 'PAY-14 body content');
    await editor.getEnterYourTagsInput.fill('test');

    const settings: AdvancedSettingsConfig = {
      maxPayout: '0',
      payoutType: '50%'
    };
    await configureAdvancedSettings(page, settings);
    await expectPublishingPanelOptions(page, settings);

    await submitPost(page);
    await broadcast.waitForCount(1);

    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: POST_COMMUNITY,
      author: POST_AUTHOR,
      permlinkPattern: /pay-14-fixture-test-post$/
    });
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-14-fixture-test-post$/,
      max_accepted_payout: hbdAsset(0),
      percent_hbd: 10000,
      beneficiaries: []
    });
  });

  test('PAY-15: custom (100 HBD) + 100% Power Up + 1 beneficiary (in community)', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityNewPostLoggedIn(page);
    const editor = new PostEditorPage(page);

    await editor.getPostTitleInput.fill('PAY-15 fixture-test post');
    await fillPostBody(page, 'PAY-15 body content');
    await editor.getEnterYourTagsInput.fill('test');

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

    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: POST_COMMUNITY,
      author: POST_AUTHOR,
      permlinkPattern: /pay-15-fixture-test-post$/
    });
    expectCommentOptionsOperation(broadcast.calls[0], {
      author: POST_AUTHOR,
      permlinkPattern: /pay-15-fixture-test-post$/,
      max_accepted_payout: hbdAsset(DEFAULT_CUSTOM_HBD),
      percent_hbd: 0,
      beneficiaries: [{ account: BENEFICIARY_A, weight: 1000 }]
    });
  });
});
