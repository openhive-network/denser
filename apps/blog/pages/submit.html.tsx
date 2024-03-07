import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';
import { useUser } from '@smart-signer/lib/auth/use-user';
import PostForm from '../components/post-form';
import { useState, useEffect } from 'react';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};
function Submit() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const { user } = useUser();
  return (
    <div className="px-4 py-8">
      {isClient && user?.username ? (
        <PostForm username={user.username} />
      ) : (
        <div
          className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
          data-testid="log-in-to-make-post-message"
        >
          Log in to make a post.
        </div>
      )}
    </div>
  );
}

export default Submit;
