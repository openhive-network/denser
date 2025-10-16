import UserPosts from './__posts';
import { GetServerSideProps } from 'next';
import { getAccountMetadata, getTranslations } from '@/blog/lib/get-translations';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Payouts'),
      ...(await getTranslations(ctx))
    }
  };
};
export default UserPosts;
