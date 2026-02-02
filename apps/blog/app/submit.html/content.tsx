'use client';

import PostForm from '@/blog/features/post-editor/post-form';
import PostingLoader from '@/blog/features/post-editor/posting-loader';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useRef, useState } from 'react';
import { removeStorageItem } from '@ui/lib/storage-with-ttl';

const SubmitContent = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasClearedDraft = useRef(false);

  // Clear any existing draft when creating a new post.
  // Runs synchronously before PostForm renders to prevent stale data hydration.
  if (!hasClearedDraft.current && user?.username) {
    removeStorageItem(`postData-new-${user.username}`);
    hasClearedDraft.current = true;
  }

  return (
    <>
      <div className="px-4 py-8">
        {user?.username ? (
          <PostForm
            username={user.username}
            editMode={false}
            sideBySidePreview={true}
            setIsSubmitting={setIsSubmitting}
          />
        ) : (
          <div
            className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
            data-testid="log-in-to-make-post-message"
          >
            {t('submit_page.log_in_to_post')}
          </div>
        )}
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
};

export default SubmitContent;
