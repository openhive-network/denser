import { GetStaticPropsContext, GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/auth/next-i18next.config';

export const getTranslations = async (
  ctx: GetServerSidePropsContext | GetStaticPropsContext, // Accept both context types
  localeFiles: string[] = ['common', 'smart-signer']
) => {
  // Determine locale based on context type
  let locale = i18n.defaultLocale; // Fallback to default locale

  // Check if context has the `locale` field (from getStaticProps)

  // Check if context has the `req` object (from getServerSideProps)
  if ('req' in ctx) {
    locale = ctx.req.cookies.NEXT_LOCALE || i18n.defaultLocale;
  } else if ('locale' in ctx) {
    locale = ctx.locale || i18n.defaultLocale;
  }

  // Fetch translations using the determined locale
  return await serverSideTranslations(locale, localeFiles);
};

export const getServerSidePropsDefault = async (ctx: GetStaticPropsContext | GetServerSidePropsContext) => {
  return {
    props: {
      ...(await getTranslations(ctx))
    }
  };
};
