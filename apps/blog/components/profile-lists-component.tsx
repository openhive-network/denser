import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@hive/ui/components/accordion';
import clsx from 'clsx';
import { FollowList } from '@/blog/lib/bridge';
import { useState } from 'react';
import useTranslation from 'next-translate/useTranslation';

export default function ProfileLists({
                                       username,
                                       variant,
                                       data
                                     }: {
  username: string;
  variant: string;
  data: FollowList[] | undefined;
}) {
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const filteredNames = data?.filter((value: FollowList) => {
    const searchWord = filter.toLowerCase();
    const userName = value.name.toLowerCase();
    if (userName.includes(searchWord)) {
      return true;
    }
    return false;
  });
  const onSearchChange = (e: string) => {
    setFilter(e);
  };
  const splitArrays = [];
  const chunkSize = 10;
  if (data && filteredNames && data.length > 0) {
    for (let i = 0; i < filteredNames.length; i += chunkSize) {
      const chunk = filteredNames.slice(i, i + chunkSize);
      splitArrays.push(chunk);
    }
  }
  return (
    <ProfileLayout>
      <div className='flex  flex-col items-center gap-4 p-4'>
        <Accordion type='single' collapsible className='w-1/3 text-center'>
          <AccordionItem value='item-1'>
            <AccordionTrigger className=' justify-center text-center text-xl '>
              {t('cards.user_profil.lists.list.what_is_this')}
            </AccordionTrigger>
            <AccordionContent>
              {t('cards.user_profil.lists.list.show_or_hide_descripton', {
                settings_link: <Link href={`/@/settings`} className='text-red-600'>
                  Settings
                </Link>
              })}

            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <h1 className='text-xl font-bold'>
          {variant === 'blacklisted'
            ? t('cards.user_profil.lists.list.accounts_blacklisted_by', { username: username })
            : variant === 'muted'
              ? t('cards.user_profil.lists.list.accounts_muted_by', { username: username })
              : variant === 'followedBlacklist'
                ? t('cards.user_profil.lists.followed_blacklists')
                : variant === 'followedMut'
                  ? t('cards.user_profil.lists.followed_muted_lists')
                  : null}
        </h1>
        <p
          className={clsx('text-center text-xs', {
            hidden: variant === 'followedBlacklist' || variant === 'followedMut'
          })}
        >
          {t('cards.user_profil.lists.list.list_description')}{t('cards.user_profil.lists.list.description_not_added')}
        </p>
        <ul className='flex flex-col sm:w-1/3'>
          {data && data.length === 0 ? (
            <li className='bg-slate-200 p-4 text-center text-sm font-bold dark:bg-slate-900 '>
              {t('cards.user_profil.lists.list.empty_list')}
            </li>
          ) : splitArrays.length > 0 ? (
            splitArrays[page].map((e: FollowList) => (
              <li
                key={e.name}
                className='w-full p-1 font-semibold odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900'
              >
                <Link className='text-red-600 ' href={`/@${e.name}`}>
                  {e.name}
                </Link>
                {' ' + e.blacklist_description}
              </li>
            ))
          ) : null}
        </ul>
        {splitArrays.length > 1 ? (
          <div className='flex gap-2'>
            <Button variant='outlineRed' disabled={page === 0} size='sm' onClick={() => setPage(0)}>
              {t('cards.user_profil.lists.list.first_button')}
            </Button>{' '}
            <Button variant='outlineRed' disabled={page === 0} size='sm' onClick={() => setPage(page - 1)}>
              {t('cards.user_profil.lists.list.previous_button')}
            </Button>
            <Button
              variant='outlineRed'
              disabled={page === splitArrays.length - 1}
              size='sm'
              onClick={() => setPage(page + 1)}
            >
              {t('cards.user_profil.lists.list.next_button')}
            </Button>
            <Button
              variant='outlineRed'
              disabled={page === splitArrays.length - 1}
              size='sm'
              onClick={() => setPage(splitArrays.length - 1)}
            >
              {t('cards.user_profil.lists.list.last_button')}
            </Button>
          </div>
        ) : null}
        {splitArrays.length > 1 ? (
          <div className='text-sm'>
            {t('cards.user_profil.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
          </div>
        ) : null}
        {data && data.length > 0 ? <div
          className='text-sm'>{t('cards.user_profil.lists.list.users_on_list', { number: data.length })}</div> : null}
        <h1 className='text-xl font-bold'>{t('cards.user_profil.lists.list.search_this_list')}</h1>
        <div className='flex  justify-center bg-slate-200 p-2 dark:bg-slate-900 sm:w-1/3'>
          <Input onChange={(e) => onSearchChange(e.target.value)} className='bg-white sm:w-3/4'></Input>
        </div>
        <div className='flex flex-col items-center gap-2'>
          <h1 className='text-xl font-bold'>{t('cards.user_profil.lists.list.reset_options')}</h1>
          <div className='flex gap-2'>
            <Button size='sm' variant='outlineRed' className='text-xs'>
              {variant === 'blacklisted'
                ? t('cards.user_profil.lists.list.reset_blacklist')
                : variant === 'muted'
                  ? t('cards.user_profil.lists.list.reset_muted_list')
                  : variant === 'followedBlacklist'
                    ? t('cards.user_profil.lists.list.reset_followed_blacklists')
                    : variant === 'followedMut'
                      ? t('cards.user_profil.lists.list.reset_followed_muted_list')
                      : null}
            </Button>
            <Button disabled size='sm' className='text-xs'>
              {t('cards.user_profil.lists.list.reset_all_lists')}
            </Button>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}
