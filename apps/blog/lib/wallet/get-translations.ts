import { GetStaticPropsContext, GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { getAccountFull } from '@transaction/lib/hive';

// Unified getTranslations function supporting both SSR and SSG
export const getTranslations = async (
  ctx: GetServerSidePropsContext | GetStaticPropsContext, // Accept both context types
  localeFiles: string[] = ['common_blog', 'smart-signer']
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

export interface MetadataProps {
  tabTitle: string;
  description: string;
  image: string;
  title: string;
}

export const getAccountMetadata = async (
  firstParam: string,
  descriptionText: string
): Promise<MetadataProps> => {
  let metadata = {
    tabTitle: '',
    description: '',
    image: '',
    title: firstParam
  };
  if (firstParam.startsWith('@')) {
    try {
      const username = firstParam.split('@')[1];
      const data = await getAccountFull(username);

      if (!data) {
        throw new Error(`Account ${username} not found`);
      }

      const displayName = data.profile?.name || data.name;
      const defaultImage = 'https://hive.blog/images/hive-blog-share.png';

      metadata = {
        ...metadata,
        image: data.profile?.profile_image || defaultImage,
        tabTitle:
          displayName === username
            ? `${descriptionText} ${displayName} - Hive`
            : `${descriptionText} ${displayName} (${firstParam}) - Hive`,
        description:
          data.profile?.about || `${descriptionText} ${firstParam}. Hive: Communities Without Borders.`
      };
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }
  return metadata;
};
