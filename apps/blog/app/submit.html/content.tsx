'use client';

import { LitePostEntry } from '@/blog/features/lite-account/lite-post-entry';
import { useAdoptedLiteRootDraft } from '@/blog/features/lite-account/use-lite-sign-in-handoff';
import { newPostDraftKey } from '@/blog/features/post-editor/hooks/use-post-form-state';
import PostForm from '@/blog/features/post-editor/post-form';
import PostingLoader from '@/blog/features/post-editor/posting-loader';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const SubmitContent = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categoryParam = useSearchParams()?.get('category') ?? undefined;
  const draftReady = useAdoptedLiteRootDraft(user?.username ? newPostDraftKey(user.username) : '');

  // Draft is saved automatically by PostForm via useStorageWithTTL
  // and cleared only when:
  // 1. Post is successfully submitted (removePost() in onSubmit)
  // 2. User clicks "Clean" button (handleCancel)

  return (
    <>
      <div className="px-4 py-8">
        {user?.username ? (
          draftReady ? (
            <PostForm
              username={user.username}
              editMode={false}
              sideBySidePreview={true}
              setIsSubmitting={setIsSubmitting}
            />
          ) : null
        ) : (
          <LitePostEntry
            categoryParam={categoryParam}
            signInPrompt={
              <div
                className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
                data-testid="log-in-to-make-post-message"
              >
                {t('submit_page.log_in_to_post')}
              </div>
            }
          />
        )}
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
};

export default SubmitContent;
