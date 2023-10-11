import { useQuery } from '@tanstack/react-query';
import { getAccount } from '@hive/ui/lib/hive';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { Button } from '@hive/ui';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';

function CurationRewardsPage({
                               username
                             }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError
  } = useQuery(['accountData', username], () => getAccount(username), {
    enabled: Boolean(username)
  });
  console.log(accountData);

  return (
    <ProfileLayout>
      <div>
        <div className='text-sm flex flex-col sm:flex-row sm:justify-between p-2 sm:p-4 border-b-2'>
          <div>Estimated curation rewards last week:</div>
          <div className='flex flex-col'>
            <span>0.000 HIVE POWER</span>
          </div>
        </div>
        <div className='flex flex-col gap-4 p-2 sm:p-4'>
          <h4 className='text-lg'>Curation Rewards History</h4>
          <div className='flex justify-between'>
            <Button variant='outlineRed' size='sm' disabled>
              Newer
            </Button>
            <Button variant='outlineRed' size='sm' disabled>
              Older
            </Button>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}

export default CurationRewardsPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};