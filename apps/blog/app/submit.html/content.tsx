'use client';

import PostForm from '@/blog/features/post-editor/post-form';
import PostingLoader from '@/blog/features/post-editor/posting-loader';
import { useTranslation } from '@/blog/i18n/client';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useState } from 'react';

const SubmitContent = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <div className="px-4 py-8">
        {user?.username ? (
          <PostForm
            communitiesList={communitiesList}
            username={user.username}
            entryValues={storedPost}
            defaultValues={defaultValues}
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
