import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';

export const getTranslations = async (
        ctx: GetServerSidePropsContext,
        localeFiles: string[] = ['common_blog', 'smart-signer']
        ) => {
    return await serverSideTranslations(
        ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale,
        localeFiles
        );
};
