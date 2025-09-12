import CustomError from './custom-error';

const PostRedirectPage = ({ url }: { url: string }) => {
  return (
    <>
      {!url ? (
        <CustomError />
      ) : (
        <div>
          <>
            Redirecting to <a href={url}>{url}</a>.
            <br />
            with location: {url}
          </>
        </div>
      )}
    </>
  );
};

export default PostRedirectPage;
