import { useEffect } from 'react';
import CustomError from './custom-error';

const PostRedirectPage = ({ url }: { url: string }) => {
  useEffect(() => {
    if (url) {
      // Perform the actual redirect
      window.location.href = url;
    }
  }, [url]);

  return (
    <>
      {!url ? (
        <CustomError />
      ) : (
        <div>
          <>
            Redirecting to <a href={url}>{url}</a>...
          </>
        </div>
      )}
    </>
  );
};

export default PostRedirectPage;
