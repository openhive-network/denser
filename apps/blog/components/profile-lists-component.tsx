import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@hive/ui/components/accordion';
import clsx from 'clsx';
import { FollowList } from '@ui/lib/bridge';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { operationService } from '@operations/index';

export default function ProfileLists({
  username,
  variant,
  data
}: {
  username: string;
  variant: string;
  data: FollowList[] | undefined;
}) {
  const { user } = useUser();
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
      <div className="flex  flex-col items-center gap-4 p-4">
        <Accordion type="single" collapsible className="w-1/3 text-center">
          <AccordionItem value="item-1">
            <AccordionTrigger className=" justify-center text-center text-xl ">
              {t('user_profil.lists.list.what_is_this')}
            </AccordionTrigger>
            <AccordionContent>
              {t('user_profil.lists.list.show_or_hide_descripton', {
                settings_link: (
                  <Link href={`/@/settings`} className="text-red-600">
                    Settings
                  </Link>
                )
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <h1 className="text-xl font-bold">
          {variant === 'blacklisted'
            ? t('user_profil.lists.list.accounts_blacklisted_by', { username: username })
            : variant === 'muted'
            ? t('user_profil.lists.list.accounts_muted_by', { username: username })
            : variant === 'followedBlacklist'
            ? t('user_profil.lists.followed_blacklists')
            : variant === 'followedMut'
            ? t('user_profil.lists.followed_muted_lists')
            : null}
        </h1>
        <p
          className={clsx('text-center text-xs', {
            hidden: variant === 'followedBlacklist' || variant === 'followedMut'
          })}
        >
          {t('user_profil.lists.list.list_description')}
          {t('user_profil.lists.list.description_not_added')}
        </p>
        <ul className="flex flex-col ">
          {data && data.length === 0 ? (
            <li className="bg-slate-200 p-4 text-center text-sm font-bold dark:bg-slate-900 ">
              {t('user_profil.lists.list.empty_list')}
            </li>
          ) : splitArrays.length > 0 ? (
            splitArrays[page].map((e: FollowList) => (
              <li
                key={e.name}
                className="flex w-full items-center justify-between p-1 font-semibold odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900"
              >
                <span className="px-2">
                  <Link className="text-red-600 " href={`/@${e.name}`}>
                    {e.name}
                  </Link>
                  {' ' + e.blacklist_description}
                </span>
                {user?.isLoggedIn && user?.username === username ? (
                  <Button
                    variant="outlineRed"
                    className="whitespace-nowrap p-1"
                    size="xs"
                    onClick={() => {
                      if (variant === 'muted') {
                        operationService.follow(username, user, 'unmute');
                      }
                    }}
                  >
                    {variant === 'blacklisted'
                      ? 'unblacklist'
                      : variant === 'muted'
                      ? 'unmute'
                      : variant === 'followedBlacklist'
                      ? t('unfollow blacklist')
                      : variant === 'followedMut'
                      ? t('unfollow muted list')
                      : null}
                  </Button>
                ) : null}
              </li>
            ))
          ) : null}
        </ul>
        {splitArrays.length > 1 ? (
          <div className="flex gap-2">
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
              {t('user_profil.lists.list.first_button')}
            </Button>{' '}
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(page - 1)}>
              {t('user_profil.lists.list.previous_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(page + 1)}
            >
              {t('user_profil.lists.list.next_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(splitArrays.length - 1)}
            >
              {t('user_profil.lists.list.last_button')}
            </Button>
          </div>
        ) : null}
        {splitArrays.length > 1 ? (
          <div className="text-sm">
            {t('user_profil.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
          </div>
        ) : null}
        {data && data.length > 0 ? (
          <div className="text-sm">{t('user_profil.lists.list.users_on_list', { number: data.length })}</div>
        ) : null}
        {user?.isLoggedIn && user?.username === username ? (
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">Add Account(s) To List</h1>
            <span className="text-sm">(single account or comma separated list)</span>
            <div className="flex w-full justify-center bg-slate-200 p-2 dark:bg-slate-900">
              <Input className="bg-white sm:w-3/4"></Input>
            </div>{' '}
          </div>
        ) : null}
        <h1 className="text-xl font-bold">{t('user_profil.lists.list.search_this_list')}</h1>
        <div className="flex  justify-center bg-slate-200 p-2 dark:bg-slate-900 sm:w-1/3">
          <Input onChange={(e) => onSearchChange(e.target.value)} className="bg-white sm:w-3/4"></Input>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold">{t('user_profil.lists.list.reset_options')}</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outlineRed" className="text-xs">
              {variant === 'blacklisted'
                ? t('user_profil.lists.list.reset_blacklist')
                : variant === 'muted'
                ? t('user_profil.lists.list.reset_muted_list')
                : variant === 'followedBlacklist'
                ? t('user_profil.lists.list.reset_followed_blacklists')
                : variant === 'followedMut'
                ? t('user_profil.lists.list.reset_followed_muted_list')
                : null}
            </Button>
            <Button disabled size="sm" className="text-xs">
              {t('user_profil.lists.list.reset_all_lists')}
            </Button>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}
