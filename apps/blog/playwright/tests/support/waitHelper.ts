import { Page } from '@playwright/test';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { waitForElementVisible, waitForElementColor, waitForCommentIsVisible } from './utils';

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
