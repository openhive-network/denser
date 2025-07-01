import { Page } from '@playwright/test';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { CommentEditorPage } from './pages/commentEditorPage';
import { waitForElementVisible, waitForElementColor, waitForCommentIsVisible } from './utils';
import { UnmoderatedTagPage } from './pages/unmoderatedTagPage';

export async function waitForCommunitySubscribeButton(page: Page) {
    const communityPage = new CommunitiesPage(page);
    const selectorSubscribeButton = communityPage.communitySubscribeButton['_selector'];
    const timeout = 20000;
    const interval = 4000;

    await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForCommunityJoinedLeaveButton(page: Page) {
    const communityPage = new CommunitiesPage(page);
    const selectorSubscribeButton = communityPage.communityJoinedLeaveButton['_selector'];
    const timeout = 30000;
    const interval = 3000;

    await waitForElementVisible(page, selectorSubscribeButton, timeout, interval);
}

export async function waitForCommunityCreatedPost(page:Page, postTitle: string) {
    const communityPage = new CommunitiesPage(page);
    const selectorCreatedPost = communityPage.page.getByText(postTitle)['_selector'];
    const timeout = 20000;
    const interval = 4000;

    await waitForElementVisible(page, selectorCreatedPost , timeout, interval);
}

export async function waitForPostIsVisibleInUnmoderatedTagPage(page:Page, postTitle: string) {
    const unmoderatedTagPage = new UnmoderatedTagPage(page);
    const selectorCreatedPost = unmoderatedTagPage.page.getByText(postTitle)['_selector'];
    const timeout = 20000;
    const interval = 4000;

    await waitForElementVisible(page, selectorCreatedPost , timeout, interval);
}

export async function waitForCreatedCommentIsVisible(page: Page, commentContent: string) {
    const timeout = 20000;
    const interval = 4000;

    await waitForCommentIsVisible(page, commentContent, timeout, interval);
}

export async function waitForBroadcastedUpvoteLightMode(page: Page) {
    const selectorFirstPostUpvoteButtonLocator = page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg')['_selector'];
    const timeout = 20000;
    const interval = 4000;
    const lightModeRedColor = 'rgb(218, 43, 43)'; // upvote icon's color not processed in the dark mode

    await waitForElementColor(page, selectorFirstPostUpvoteButtonLocator, lightModeRedColor, timeout, interval);
}

export async function waitForProcessedUpvoteLightMode(page: Page) {
    const selectorFirstPostUpvoteButtonLocator = page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg')['_selector'];
    const timeout = 20000;
    const interval = 4000;
    const lightModeWhiteColor = 'rgb(255, 255, 255)'; // upvote icon's color processed in the light mode

    await waitForElementColor(page, selectorFirstPostUpvoteButtonLocator, lightModeWhiteColor, timeout, interval);
 }

 export async function waitForCircleSpinnerIsDetatched(page: Page) {
    await page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
 }
