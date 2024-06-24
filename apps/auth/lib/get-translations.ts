import { GetServerSidePropsContext, GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/auth/next-i18next.config';

export const getTranslations = async (
        ctx: GetServerSidePropsContext,
        localeFiles: string[] = ['common', 'smart-signer']
        ) => {
    return await serverSideTranslations(
        ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale,
        localeFiles
        );
};

export const getServerSidePropsDefault: GetServerSideProps = async (ctx) => {
    return {
        props: {
            ...(await getTranslations(ctx))
        }
    };
};
