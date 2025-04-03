import UserPosts from './posts';
import { GetServerSideProps } from 'next';
import { getTranslations } from '../../lib/get-translations';
import { getAccountFull } from '@transaction/lib/hive';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const firstParam = (ctx.params?.param as string) ?? '';

  let tabTitle;
  if (firstParam.startsWith('@')) {
    try {
      // Fetch account data
      const data = await getAccountFull(firstParam.split('@')[1]);
      if (data) {
        // If the account data exists, set the username to the account name
        const username = data?.profile?.name ?? data.name;
        tabTitle =
          '@' + username === firstParam
            ? `Comments by ${username} - Hive`
            : `Comments by ${username}(${firstParam}) - Hive`;
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }

  return {
    props: {
      tabTitle,
      ...(await getTranslations(ctx))
    }
  };
};

export default UserPosts;
