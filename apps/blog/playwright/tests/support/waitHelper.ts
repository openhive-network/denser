import { Page } from '@playwright/test';
import { testTimeout } from '../../../../../playwright/support/timeouts';
import { HomePage } from './pages/homePage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { CommentEditorPage } from './pages/commentEditorPage';
import {
  waitForElementVisible,
  waitForElementColor,
  waitForDownvoteColor,
  waitForCommentIsVisible
} from './utils';
import { UnmoderatedTagPage } from './pages/unmoderatedTagPage';
import { CommunitiesExplorePage } from './pages/communitiesExplorerPage';
import { locatorSelector } from './locatorSelector';

export async function waitForCommunitySubscribeButton(page: Page) {
  const communityPage = new CommunitiesPage(page);
  const selectorSubscribeButton = locatorSelector(communityPage.communitySubscribeButton);
  const timeout = testTimeout('community-subscribe-button', 20000);
  const interval = 4000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForCommunityJoinedLeaveButton(page: Page) {
  const communityPage = new CommunitiesPage(page);
  const selectorSubscribeButton = locatorSelector(communityPage.communityJoinedLeaveButton);
  const timeout = testTimeout('community-joined-leave-button', 30000);
  const interval = 3000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForLifestyleCommunitySubscribeButtonInCommunityExplorerPage(page: Page) {
  const communitiesExplorerPage = new CommunitiesExplorePage(page);
  const selectorSubscribeButton = locatorSelector(communitiesExplorerPage.getLifestyleCommunityButton);
  const timeout = testTimeout('lifestyle-community-subscribe-button-in-community-explorer-page', 20000);
  const interval = 4000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForLifestyleCommunityJoinedLeaveButtonInCommunityExplorerPage(page: Page) {
  const communitiesExplorerPage = new CommunitiesExplorePage(page);
  const selectorJoinedLeaveButton = locatorSelector(communitiesExplorerPage.getLifestyleCommunityButton);
  const timeout = testTimeout('lifestyle-community-joined-leave-button-in-community-explorer-page', 30000);
  const interval = 3000;

  await waitForElementVisible(page, selectorJoinedLeaveButton, timeout, interval);
}

export async function waitForCommentEditorIsLoaded(page: Page) {
  const commentEditorPage = new CommentEditorPage(page);
  const commentRepleyEditor = locatorSelector(commentEditorPage.getReplayEditorElement);
  const timeout = testTimeout('comment-editor-is-loaded', 20000);
  const interval = 4000;

  await waitForElementVisible(page, commentRepleyEditor, timeout, interval);
}

export async function waitForCommunityCreatedPost(page: Page, postTitle: string) {
  const communityPage = new CommunitiesPage(page);
  const selectorCreatedPost = locatorSelector(communityPage.page.getByText(postTitle));
  const timeout = testTimeout('community-created-post', 20000);
  const interval = 4000;

  await waitForElementVisible(page, selectorCreatedPost, timeout, interval);
}

export async function waitForPostIsVisibleInUnmoderatedTagPage(page: Page, postTitle: string) {
  const unmoderatedTagPage = new UnmoderatedTagPage(page);
  const selectorCreatedPost = locatorSelector(unmoderatedTagPage.page.getByText(postTitle).first());
  const timeout = testTimeout('post-is-visible-in-unmoderated-tag-page', 20000);
  const interval = 4000;

  await waitForElementVisible(page, selectorCreatedPost, timeout, interval);
}

export async function waitForCreatedCommentIsVisible(page: Page, commentContent: string) {
  const timeout = testTimeout('created-comment-is-visible', 30000);
  const interval = 4000;

  await waitForCommentIsVisible(page, commentContent, timeout, interval);
}

export async function waitForFirstBroadcastedUpvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostUpvoteButton = locatorSelector(homePage.firstPostCardUpvoteButtonLocator);

  const timeout = testTimeout('first-broadcasted-upvote-light-mode', 20000);
  const interval = 4000;
  const lightModeRedColor = 'rgb(218, 43, 43)'; // upvote icon's color not processed in the dark mode

  await waitForElementColor(page, selectorFirstPostUpvoteButton, lightModeRedColor, timeout, interval);
}

export async function waitForFirstProcessedUpvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostUpvoteButton = locatorSelector(homePage.firstPostCardUpvoteButtonLocator);
  const timeout = testTimeout('first-processed-upvote-light-mode', 20000);
  const interval = 4000;
  const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

  await waitForElementColor(page, selectorFirstPostUpvoteButton, lightModeWhiteColor, timeout, interval);
}

export async function waitForFirstBroadcastedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = locatorSelector(homePage.firstPostCardDownvoteButtonLocator);

  const timeout = testTimeout('first-broadcasted-downvote-light-mode', 20000);
  const interval = 4000;
  const lightModeRedColor = 'rgb(75, 85, 99)'; // upvote icon's color not processed in the dark mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeRedColor, timeout, interval);
}

export async function waitForFirstProcessedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = locatorSelector(homePage.firstPostCardDownvoteButtonLocator);
  const timeout = testTimeout('first-processed-downvote-light-mode', 20000);
  const interval = 4000;
  const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeWhiteColor, timeout, interval);
}

export async function waitForSecondBroadcastedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = locatorSelector(homePage.getSecondPostDownvoteButtonIcon);

  const timeout = testTimeout('second-broadcasted-downvote-light-mode', 20000);
  const interval = 4000;
  const lightModeRedColor = 'rgb(75, 85, 99)'; // upvote icon's color not processed in the dark mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeRedColor, timeout, interval);
}

export async function waitForSecondProcessedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = locatorSelector(homePage.getSecondPostDownvoteButtonIcon);
  const timeout = testTimeout('second-processed-downvote-light-mode', 20000);
  const interval = 4000;
  const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeWhiteColor, timeout, interval);
}

export async function waitForCircleSpinnerIsDetatched(page: Page) {
  await page.waitForSelector('.circle__Wrapper-sc-16bbsoy-0', { state: 'detached' });
}

export async function waitForLifestyleMySubscriptionsLink(page: Page) {
  const homePage = new HomePage(page);
  const selectorLifestyleMySubscriptionLink = locatorSelector(homePage.getLifestyleCommunityLink);
  const timeout = testTimeout('lifestyle-my-subscriptions-link', 20000);
  const interval = 4000;

  await waitForElementVisible(page, selectorLifestyleMySubscriptionLink, timeout, interval);
}
