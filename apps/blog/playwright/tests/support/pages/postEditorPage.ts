import { Locator, Page, expect } from '@playwright/test';

export class PostEditorPage {
    readonly page: Page;
    readonly getFormAndPreviewContainer: Locator;
    readonly getHideShowPreviewButton: Locator;
    readonly getEnableDisableSideBySideEditor: Locator;
    readonly getPreviewContainer: Locator;
    readonly getFormContainer: Locator;
    readonly getPostTitleInput: Locator;
    readonly getEditorContent: Locator;
    readonly getEditorContentTextarea: Locator;
    readonly getEditorToolbar: Locator;
    readonly getBoldButtonInEditorToolbar: Locator;
    readonly getItalicButtonInEditorToolbar: Locator;
    readonly getStrikeThroughButtonInEditorToolbar: Locator;
    readonly getHrButtonInEditorToolbar: Locator;
    readonly getTitleButtonInEditorToolbar: Locator;
    readonly getLinkButtonInEditorToolbar: Locator;
    readonly getQuoteButtonInEditorToolbar: Locator;
    readonly getCodeButtonInEditorToolbar: Locator;
    readonly getCodeBlockButtonInEditorToolbar: Locator;
    readonly getImageButtonInEditorToolbar: Locator;
    readonly getTableButtonInEditorToolbar: Locator;
    readonly getUnorderedListButtonInEditorToolbar: Locator;
    readonly getOrderedListButtonInEditorToolbar: Locator;
    readonly getCheckedListButtonInEditorToolbar: Locator;
    readonly getSelectImageButtonInEditorToolbar: Locator;
    readonly getPostSummaryInput: Locator;
    readonly getEnterYourTagsInput: Locator;
    readonly getAuthorInput: Locator;
    readonly getAuthorRewardsDescription: Locator;
    readonly getMaximumAcceptedPayoutDescription: Locator;
    readonly getAdvancedSettingsButton: Locator;
    readonly getResourceCreditsDescription: Locator;
    readonly getPostingToListTrigger: Locator;
    readonly getSubmitPostButton: Locator;
    readonly getCleanPostButton: Locator;
    readonly getPostSubmittedToast: Locator;
    readonly getTitleErrorMessage: Locator;
    readonly getBeneficiariesOptionsInfo: Locator;
    readonly getSyncScrollToggle: Locator;
    readonly getSyncScrollContainer: Locator;
    readonly getEditorScroller: Locator;
    readonly getPreviewScroller: Locator;

    constructor(page: Page) {
        this.page = page;
        this.getFormAndPreviewContainer = page.getByTestId('form-and-preview-container');
        this.getHideShowPreviewButton = page.getByTestId('hide-show-preview');
        this.getEnableDisableSideBySideEditor = page.getByTestId('enable-disable-side-by-side-editor');
        this.getPreviewContainer = page.getByTestId('preview-container');
        this.getFormContainer = page.getByTestId('form-container');
        this.getPostTitleInput = page.getByTestId('post-title-input');
        this.getEditorContent = page.locator('div.cm-editor');
        this.getEditorContentTextarea = this.getEditorContent.locator('.cm-content');
        this.getEditorToolbar = page.getByTestId('editor-toolbar');
        this.getBoldButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="bold"]');
        this.getItalicButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="italic"]');
        this.getStrikeThroughButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="strikethrough"]');
        this.getHrButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="hr"]');
        this.getTitleButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="title"]');
        this.getLinkButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="link"]');
        this.getQuoteButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="quote"]');
        this.getCodeButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="code"]');
        this.getCodeBlockButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="codeBlock"]');
        this.getImageButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="image"]');
        this.getTableButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="table"]');
        this.getUnorderedListButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="unordered-list"]');
        this.getOrderedListButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="ordered-list"]');
        this.getCheckedListButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="checked-list"]');
        this.getSelectImageButtonInEditorToolbar = this.getEditorToolbar.locator('[data-name="text2image"]');
        this.getPostSummaryInput = page.locator('[name="postSummary"]');
        this.getEnterYourTagsInput = page.locator('[name="tags"]');
        this.getAuthorInput = page.locator('[name="author"]');
        this.getAuthorRewardsDescription = page.locator('[data-testid="author-rewards-description"]');
        this.getMaximumAcceptedPayoutDescription = page.getByText('Maximum Accepted Payout');
        this.getAdvancedSettingsButton = page.locator('[data-testid="advanced-settings-button"]');
        this.getResourceCreditsDescription = page.locator('[data-testid="resource-credits-description"]');
        this.getPostingToListTrigger = page.locator('[data-testid="posting-to-list-trigger"]');
        this.getSubmitPostButton = page.locator('[data-testid="submit-post-button"]');
        this.getCleanPostButton = page.locator('[data-testid="clean-post-button"]');
        // Success toast fired by usePostMutation.onSuccess after the
        // broadcasted comment_operation is observed in a block.
        this.getPostSubmittedToast = page.getByText('Post submitted successfully', { exact: true });
        this.getTitleErrorMessage = page.locator('[data-testid="form-container"] p').filter( {hasText: 'String must contain at least'});
        this.getBeneficiariesOptionsInfo = page.locator('span:text("Beneficiaries:")');
        this.getSyncScrollToggle = page.getByTestId('sync-scroll-toggle');
        this.getSyncScrollContainer = page.getByTestId('sync-scroll-container');
        this.getEditorScroller = this.getEditorContent.locator('.cm-scroller');
        this.getPreviewScroller = page.getByTestId('preview-scroller');
    }

    async validateDefaultPostEditorIsLoaded() {
        expect(this.getPostTitleInput).toHaveAttribute('placeholder', 'Title');
        expect(this.getFormContainer).toBeVisible();
        expect(this.getPreviewContainer).toBeVisible();
        expect(this.getEditorContent).toBeVisible();
        expect(this.getPostSummaryInput).toHaveAttribute('placeholder', 'Post summary(for posts & SEO, max 140 chars)');
        expect(this.getEnterYourTagsInput).toHaveAttribute('placeholder', 'Enter your tags separated by a space');
        expect(this.getAdvancedSettingsButton).toBeVisible();
        expect(this.getPostingToListTrigger).toBeVisible();
        expect(this.getSubmitPostButton).toBeVisible();
    }

    async validateDefaultPostEditorForSpecificCommunityIsLoaded(communityName: string) {
        expect(this.getPostTitleInput).toHaveAttribute('placeholder', 'Title');
        expect(this.getFormContainer).toBeVisible();
        expect(this.getPreviewContainer).toBeVisible();
        expect(this.getEditorContent).toBeVisible();
        expect(this.getPostSummaryInput).toHaveAttribute('placeholder', 'Post summary(for posts & SEO, max 140 chars)');
        expect(this.getEnterYourTagsInput).toHaveAttribute('placeholder', 'Enter your tags separated by a space');
        expect(this.getAdvancedSettingsButton).toBeVisible();
        expect(this.getPostingToListTrigger).toContainText(communityName);
        expect(this.getSubmitPostButton).toBeVisible();
    }

    async validateThePostEditorOfSpecificPostIsLoaded(postTitle: string, postContent: string, postSummary: string, postTags: string){
        await this.page.waitForSelector(this.getSubmitPostButton['_selector']);
        expect(this.getPostTitleInput).toHaveValue(postTitle);
        expect(this.getFormContainer).toBeVisible();
        expect(this.getPreviewContainer).toBeVisible();
        expect(this.getEditorContent).toContainText(postContent);
        expect(this.getPostSummaryInput).toHaveValue(postSummary);
        expect(this.getEnterYourTagsInput).toHaveValue(postTags);
        expect(this.getSubmitPostButton).toBeVisible();
    }

    async createSimplePost(
        postTitle: string,
        postContentText: string,
        postSummary: string,
        postTag: string
    ) {
        // Validate the post editor is loaded
        await this.validateDefaultPostEditorIsLoaded();
        // Type the title of the post
        await this.getPostTitleInput.fill(postTitle);
        // Type the content of the post (CodeMirror uses contenteditable div)
        await this.getEditorContentTextarea.click();
        await this.page.keyboard.type(postContentText);
        // Type the post summary
        await this.getPostSummaryInput.fill(postSummary);
        // Type the tag
        await this.getEnterYourTagsInput.fill(postTag);
        // Click the submit button
        await this.getSubmitPostButton.click();
    }

    async createSimplePostForCommunity(
        postTitle: string,
        postContentText: string,
        postSummary: string,
        postTag: string,
        communitySelectOptionValue: string
    ) {
        // Validate the post editor is loaded
        await this.validateDefaultPostEditorIsLoaded();
        // Type the title of the post
        await this.getPostTitleInput.fill(postTitle);
        // Type the content of the post (CodeMirror uses contenteditable div)
        await this.getEditorContentTextarea.click();
        await this.page.keyboard.type(postContentText);
        // Type the post summary
        await this.getPostSummaryInput.fill(postSummary);
        // Type the tag
        await this.getEnterYourTagsInput.fill(postTag);
        // Set a community
        await this.getPostingToListTrigger.locator('//following-sibling::select').selectOption(communitySelectOptionValue);
        // Click the submit button
        await this.getSubmitPostButton.click();
    }

    async fillInSimplePost(
        postTitle: string,
        postContentText: string,
        postSummary: string,
        postTag: string
    ) {
        // Validate the post editor is loaded
        await this.validateDefaultPostEditorIsLoaded();
        // Type the title of the post
        await this.getPostTitleInput.fill(postTitle);
        // Type the content of the post (CodeMirror uses contenteditable div)
        await this.getEditorContentTextarea.click();
        await this.page.keyboard.type(postContentText);
        // Type the post summary
        await this.getPostSummaryInput.fill(postSummary);
        // Type the tag
        await this.getEnterYourTagsInput.fill(postTag);
    }

}
