import { Page } from '@playwright/test';
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

export async function waitForCommunitySubscribeButton(page: Page) {
  const communityPage = new CommunitiesPage(page);
  const selectorSubscribeButton = await communityPage.communitySubscribeButton['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForCommunityJoinedLeaveButton(page: Page) {
  const communityPage = new CommunitiesPage(page);
  const selectorSubscribeButton = await communityPage.communityJoinedLeaveButton['_selector'];
  const timeout = 30000;
  const interval = 3000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForLifestyleCommunitySubscribeButtonInCommunityExplorerPage(page: Page) {
  const communitiesExplorerPage = new CommunitiesExplorePage(page);
  const selectorSubscribeButton = await communitiesExplorerPage.getLifestyleCommunityButton['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForLifestyleCommunityJoinedLeaveButtonInCommunityExplorerPage(page: Page) {
  const communitiesExplorerPage = new CommunitiesExplorePage(page);
  const selectorJoinedLeaveButton = await communitiesExplorerPage.getLifestyleCommunityButton['_selector'];
  const timeout = 30000;
  const interval = 3000;

  await waitForElementVisible(page, selectorJoinedLeaveButton, timeout, interval);
}

export async function waitForCommentEditorIsLoaded(page: Page) {
  const commentEditorPage = new CommentEditorPage(page);
  const commentRepleyEditor = await commentEditorPage.getReplayEditorElement['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, commentRepleyEditor, timeout, interval);
}

export async function waitForCommunityCreatedPost(page: Page, postTitle: string) {
  const communityPage = new CommunitiesPage(page);
  const selectorCreatedPost = await communityPage.page.getByText(postTitle)['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, selectorCreatedPost, timeout, interval);
}

export async function waitForPostIsVisibleInUnmoderatedTagPage(page: Page, postTitle: string) {
  const unmoderatedTagPage = new UnmoderatedTagPage(page);
  const selectorCreatedPost = await unmoderatedTagPage.page.getByText(postTitle).first()['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, selectorCreatedPost, timeout, interval);
}

export async function waitForCreatedCommentIsVisible(page: Page, commentContent: string) {
  const timeout = 30000;
  const interval = 4000;

  await waitForCommentIsVisible(page, commentContent, timeout, interval);
}

export async function waitForFirstBroadcastedUpvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostUpvoteButton = await homePage.firstPostCardUpvoteButtonLocator['_selector'];

  const timeout = 20000;
  const interval = 4000;
  const lightModeRedColor = 'rgb(218, 43, 43)'; // upvote icon's color not processed in the dark mode

  await waitForElementColor(page, selectorFirstPostUpvoteButton, lightModeRedColor, timeout, interval);
}

export async function waitForFirstProcessedUpvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostUpvoteButton = await homePage.firstPostCardUpvoteButtonLocator['_selector'];
  const timeout = 20000;
  const interval = 4000;
  const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

  await waitForElementColor(page, selectorFirstPostUpvoteButton, lightModeWhiteColor, timeout, interval);
}

export async function waitForFirstBroadcastedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = await homePage.firstPostCardDownvoteButtonLocator['_selector'];

  const timeout = 20000;
  const interval = 4000;
  const lightModeRedColor = 'rgb(75, 85, 99)'; // upvote icon's color not processed in the dark mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeRedColor, timeout, interval);
}

export async function waitForFirstProcessedDownvoteLightMode(page: Page) {
  const homePage = new HomePage(page);
  const selectorFirstPostDownvoteButton = await homePage.firstPostCardDownvoteButtonLocator['_selector'];
  const timeout = 20000;
  const interval = 4000;
  const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

  await waitForDownvoteColor(page, selectorFirstPostDownvoteButton, lightModeWhiteColor, timeout, interval);
}

export async function waitForCircleSpinnerIsDetatched(page: Page) {
  await page.waitForSelector('.circle__Wrapper-sc-16bbsoy-0', { state: 'detached' });
}

export async function waitForLifestyleMySubscriptionsLink(page: Page) {
  const homePage = new HomePage(page);
  const selectorLifestyleMySubscriptionLink = await homePage.getLifestyleCommunityLink['_selector'];
  const timeout = 20000;
  const interval = 4000;

  await waitForElementVisible(page, selectorLifestyleMySubscriptionLink, timeout, interval);
}
