import { Locator, Page, expect } from '@playwright/test';

export class CommentEditorPage {
    readonly page: Page;
    readonly getPostReplayButton: Locator;
    readonly getCommentReplayButton: Locator;
    readonly getReplayEditorElement: Locator;
    readonly getDisableSideBySideEditorHeader: Locator;
    readonly getTextAreaCommentEditor: Locator;
    readonly getPostButton: Locator;
    readonly getCancelButton: Locator;
    readonly getNotEmptyPreview: Locator;
    readonly getCreatedCommentContent: Locator;

    constructor(page: Page) {
        this.page = page;
        this.getPostReplayButton = page.getByTestId('comment-reply');
        this.getCommentReplayButton = page.getByTestId('comment-card-footer').getByTestId('comment-card-footer-reply');
        this.getReplayEditorElement = page.getByTestId('reply-editor');
        this.getDisableSideBySideEditorHeader = page.getByText('Disable side-by-side editor');
        this.getTextAreaCommentEditor = page.getByTestId('reply-editor').locator('textarea');
        this.getPostButton = page.locator('button:text("Post")');
        this.getCancelButton = page.locator('button:text("Cancel")');
        this.getNotEmptyPreview = page.getByTestId('reply-editor').locator('#articleBody > p');

        this.getCreatedCommentContent = page.getByTestId('comment-list-item').getByTestId('comment-card-description').locator('#articleBody > p');
    }


    async validateEmptyCommentEditorIsLoaded() {
        await this.page.waitForTimeout(3000);
        await expect(this.getReplayEditorElement).toBeVisible();
        await expect(this.getDisableSideBySideEditorHeader).toBeVisible();
        await expect(this.getTextAreaCommentEditor).toBeVisible();
        await expect(this.getPostButton).toBeDisabled();
        await expect(this.getCancelButton).toBeEnabled();
    }

    async validateCommentEditorIsLoadedByEdit() {
        await this.page.waitForTimeout(3000);
        await expect(this.getReplayEditorElement).toBeVisible();
        await expect(this.getDisableSideBySideEditorHeader).toBeVisible();
        await expect(this.getTextAreaCommentEditor).toBeVisible();
        await expect(this.getNotEmptyPreview).toBeVisible();
        await expect(this.getPostButton).toBeEnabled();
        await expect(this.getCancelButton).toBeEnabled();
    }

    async createSimpleComment(commentContent: string) {
        await this.getTextAreaCommentEditor.fill(commentContent);
        // Validate the content is displayed in the comment preview
        await expect(this.getNotEmptyPreview).toHaveText(commentContent);
        // Validate the Post button is clickable
        await expect(this.getPostButton).toBeEnabled();
        // Click the Post button
        await this.getPostButton.click();
    }

    async editSimpleComment(newCommentContent: string) {
        await this.getTextAreaCommentEditor.fill(newCommentContent);
        // Validate the content is displayed in the comment preview
        await expect(this.getNotEmptyPreview).toHaveText(newCommentContent);
        // Validate the Post button is clickable
        await expect(this.getPostButton).toBeEnabled();
        // Click the Post button
        await this.getPostButton.click();
    }

    async findCreatedCommentContentByText(commentContent: string) {
        return this.getCreatedCommentContent.getByText(commentContent);
    }

    /**
     * "Rewards: <label>" notice rendered in the reply-box footer whenever
     * `preferences.comment_rewards !== '50%'` (reply-textbox.tsx:408-417).
     * Note the lowercase 'up' in the comment-footer translation
     * (`post_content.footer.comment.power_up: 'Power up 100%'`).
     */
    rewardsNotice(label: 'Decline Payout' | 'Power up 100%'): Locator {
        return this.getReplayEditorElement.getByText(new RegExp(`Rewards:\\s*${label}`));
    }
}
