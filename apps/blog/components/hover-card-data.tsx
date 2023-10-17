import { dateToFormatted, dateToFullRelative } from '@hive/ui/lib/parse-date';
import { Button } from '@hive/ui/components/button';
import UserAvatar from '@/blog/components/user-avatar';
import Link from 'next/link';
import { useAccountQuery } from './hooks/use-accout';
import { useFollowsQuery } from './hooks/use-follows';
import { delegatedHive, numberWithCommas, vestingHive } from '@hive/ui/lib/utils';
import Big from 'big.js';
import { useDynamicGlobalData } from './hooks/use-dynamic-global-data';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';

export function HoverCardData({ author }: { author: string }) {
  const { t } = useTranslation('common_blog');
  const follows = useFollowsQuery(author);
  const account = useAccountQuery(author);
  const about = account.data && account.data.posting_json_metadata ? JSON.parse(account.data.posting_json_metadata)?.profile?.about : null;
  const dynamicData = useDynamicGlobalData();
  const delegated_hive =
    dynamicData.data && account.data ? delegatedHive(account.data, dynamicData.data) : Big(0);
  const vesting_hive =
    dynamicData.data && account.data ? vestingHive(account.data, dynamicData.data) : Big(0);
  const hp = vesting_hive.minus(delegated_hive);

  return (
    <div className='space-y-2'>
      {account.data && !account.isLoading && follows.data && !follows.isLoading ? (
        <>
          <div className='flex'>
            <Link href={`/@${author}`} data-testid='hover-card-user-avatar'>
              <UserAvatar username={author} size='large' className='h-[75px] w-[75px]' />
            </Link>
            <div>
              <Link
                href={`/@${author}`}
                className='block font-bold hover:cursor-pointer'
                data-testid='hover-card-user-name'
              >
                {account.data.posting_json_metadata ? JSON.parse(account.data.posting_json_metadata)?.profile?.name : null}
              </Link>
              <Link
                href={`/@${author}`}
                className='flex text-sm text-gray-500 hover:cursor-pointer'
                data-testid='hover-card-user-nickname'
              >
                <span className='block'>{`@${author}`}</span>
              </Link>
              <div className='grid grid-cols-2 gap-2 py-2'>
                <DialogLogin>
                  <Button
                    variant='outline'
                    size='xs'
                    className='border border-red-500 bg-transparent p-1 uppercase text-red-500 hover:border-red-600 hover:text-red-600'
                    data-testid='hover-card-user-follow-button'
                  >
                    {t('post_content.header.hover_author.follow_button')}
                  </Button>
                </DialogLogin>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2'>
            <div className='flex flex-col items-center' data-testid='user-followers'>
              {follows.data.follower_count}
              <span className='text-xs'>{t('post_content.header.hover_author.followers')}</span>
            </div>
            <div className='flex flex-col items-center' data-testid='user-following'>
              {follows.data.following_count}
              <span className='text-xs'>{t('post_content.header.hover_author.following')}</span>
            </div>
            <div className='flex flex-col items-center' data-testid='user-hp'>
              {numberWithCommas(hp.toFixed(0))}
              <span className='text-xs'>HP</span>
            </div>
          </div>
          <p data-testid='user-about' className='text-sm text-gray-500'>
            {about ? about.slice(0, 157) + (157 < about.length ? '...' : '') : null}
          </p>
          <div className='flex justify-center text-xs'>
            {t('post_content.header.hover_author.joined')} {dateToFormatted(account.data.created, 'MMMM YYYY')}
            <span className='mx-1'>•</span>
            {t('user_profil.active') + " " + dateToFullRelative(account.data.last_vote_time, t)} 
          </div>
        </>
      ) : null}
    </div>
  );
}
