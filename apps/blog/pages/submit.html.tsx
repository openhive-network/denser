import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';

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
  return (
    <div className="px-4 py-8">
      <div
        className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
        data-testid="log-in-to-make-post-message"
      >
        Log in to make a post.
      </div>
    </div>
  );
}

export default Submit;
