import { GetStaticProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import PostForm from '../components/post-form';
import { useState, useEffect } from 'react';
import { getDefaultProps } from '../lib/get-translations';
import { useTranslation } from 'next-i18next';

export const getStaticProps: GetStaticProps = getDefaultProps;

function Submit() {
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const { user } = useUser();
  return (
    <div className="px-4 py-8">
      {isClient && user?.username ? (
        <PostForm username={user.username} editMode={false} sideBySidePreview={true} />
      ) : (
        <div
          className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
          data-testid="log-in-to-make-post-message"
        >
          {t('submit_page.log_in_to_post')}
        </div>
      )}
    </div>
  );
}

export default Submit;
