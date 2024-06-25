import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import PostForm from '../components/post-form';
import { useState, useEffect } from 'react';
import { getServerSidePropsDefault } from '../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

function Submit() {
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
          Log in to make a post.
        </div>
      )}
    </div>
  );
}

export default Submit;
