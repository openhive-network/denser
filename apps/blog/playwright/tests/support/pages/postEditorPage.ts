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
    readonly getCleanConfirmationDialog: Locator;
    readonly getCleanConfirmationConfirmButton: Locator;
    readonly getPostSubmittedToast: Locator;
    readonly getImageFileInput: Locator;
    readonly getTitleErrorMessage: Locator;
    // Inline validator outputs rendered by post-form / PostMetadataSection.
    // Each one is a non-FormMessage <div> wired straight to the validator's
    // return value — visible whenever the corresponding validateXxx() emits
    // a non-null string (button-disable side-effect lives in post-form.tsx).
    readonly getSummaryErrorMessage: Locator;
    readonly getTagsErrorMessage: Locator;
    readonly getAuthorErrorMessage: Locator;
    // "Enter a title to submit" / "Enter content..." / "Enter at least one
    // tag..." hint that replaces inline errors when the field is still empty
    // (i.e. before the validator/Zod schema has anything to flag).
    readonly getSubmitRequirementsHint: Locator;
    readonly getSummaryCharCounter: Locator;
    readonly getBeneficiariesOptionsInfo: Locator;
    readonly getSyncScrollToggle: Locator;
    readonly getSyncScrollContainer: Locator;
    readonly getEditorScroller: Locator;
    readonly getPreviewScroller: Locator;
    // Edit-mode-only controls in PostPublishingSection. The advanced-settings
    // dialog is replaced by an inline Select (`edit-reward-type-select`) when
    // editing; if the post has already finalised payout (max_accepted_payout
    // === 0) the Select is replaced by the read-only "Reward options are
    // final" message — see PostPublishingSection.tsx:122-178.
    readonly getEditRewardTypeSelect: Locator;
    readonly getEditRewardTypeOptions: Locator;
    readonly getRewardOptionsFinalText: Locator;

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
        // The clean button opens a Radix AlertDialog confirming the wipe;
        // confirming runs handleCancelConfirm → form.reset(defaultValues)
        // + removePost(). Locate by role since the dialog has no testid.
        this.getCleanConfirmationDialog = page.getByRole('alertdialog');
        this.getCleanConfirmationConfirmButton = this.getCleanConfirmationDialog.getByRole(
            'button',
            { name: 'Confirm', exact: true }
        );
        // Success toast fired by usePostMutation.onSuccess after the
        // broadcasted comment_operation is observed in a block.
        this.getPostSubmittedToast = page.getByText('Post submitted successfully', { exact: true });
        // Hidden file input the editor wires to its toolbar image button
        // and to the drag&drop handler. Tests drive uploads via
        // setInputFiles on this element directly — clicking the toolbar
        // button opens the native file dialog, which Playwright cannot
        // populate.
        this.getImageFileInput = page.locator('input[type="file"][name="images"]');
        this.getTitleErrorMessage = page.locator('[data-testid="form-container"] p').filter( {hasText: 'String must contain at least'});
        // Inline validator messages live in <div class="text-xs text-destructive">
        // (summary, tags) and <div class="text-xs text-red-500"> (author) inside
        // PostMetadataSection. We anchor to the field's input, climb to its
        // FormItem (`<div class="space-y-2">`), then pick the direct-child div
        // carrying the validator string. The `[class~="…"]` token matcher is
        // load-bearing: tag-chip Badges sit in the same subtree and carry
        // `hover:text-destructive`, which a `contains()` substring match would
        // collide with — `~=` only matches whitespace-separated tokens.
        this.getSummaryErrorMessage = page
            .locator('input[name="postSummary"]')
            .locator('xpath=ancestor::*[contains(@class,"space-y-2")][1]')
            .locator(
                ':scope > div[class~="text-destructive"], :scope > div[class~="text-red-500"]'
            )
            .first();
        this.getTagsErrorMessage = page
            .locator('input[name="tags"]')
            .locator('xpath=ancestor::*[contains(@class,"space-y-2")][1]')
            .locator(
                ':scope > div[class~="text-destructive"], :scope > div[class~="text-red-500"]'
            )
            .first();
        this.getAuthorErrorMessage = page
            .locator('input[name="author"]')
            .locator('xpath=ancestor::*[contains(@class,"space-y-2")][1]')
            .locator(
                ':scope > div[class~="text-destructive"], :scope > div[class~="text-red-500"]'
            )
            .first();
        this.getSubmitRequirementsHint = page.getByTestId('submit-requirements-hint');
        // Sibling span of the summary input: shows "<len>/140", turns red >140.
        this.getSummaryCharCounter = page
            .locator('input[name="postSummary"]')
            .locator('xpath=following-sibling::span[1]');
        this.getBeneficiariesOptionsInfo = page.locator('span:text("Beneficiaries:")');
        this.getSyncScrollToggle = page.getByTestId('sync-scroll-toggle');
        this.getSyncScrollContainer = page.getByTestId('sync-scroll-container');
        this.getEditorScroller = this.getEditorContent.locator('.cm-scroller');
        this.getPreviewScroller = page.getByTestId('preview-scroller');
        this.getEditRewardTypeSelect = page.getByTestId('edit-reward-type-select');
        // Radix Select content is portaled, so options live in a sibling
        // tree from the trigger. We anchor on role+name once the listbox
        // opens. Use within the spec via `option.click()`.
        this.getEditRewardTypeOptions = page.getByRole('option');
        // Translation key `submit_page.reward_options_final` resolves to
        // "Payout has been declined and cannot be changed". Pin the regex
        // to the stable substring rather than the whole sentence — minor
        // copy edits shouldn't break the locator.
        this.getRewardOptionsFinalText = page.getByText(/payout has been declined/i);
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

    /**
     * Pick a community from the editor's "Posting to" dropdown. Radix
     * Select renders a hidden native `<select>` as a sibling of the
     * visible trigger for a11y; we drive that hidden element via
     * `selectOption` so we don't have to dance with the popover. The
     * value is the community id (e.g. `hive-167922`).
     */
    async selectPostingToCommunity(communityId: string) {
        await this.getPostingToListTrigger
            .locator('//following-sibling::select')
            .selectOption(communityId);
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
