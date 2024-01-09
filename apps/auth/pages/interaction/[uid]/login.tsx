import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next.config';

export default function HomePage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <div className="font-bold text-lg sm:text-3xl">Login</div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {

  try {
    const { req, res } = ctx;
    const { uid } = ctx.query;
    console.info(`uid is: ${uid}`);
    if (req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({foo: 'bar'}));
      // return;
    }
  } catch(e) {
    throw e;
  }

  return {
    props: {
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_auth']))
    }
  };
};
