import ProfileLayout from '@/components/common/profile-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import clsx from 'clsx';
import { FollowList } from '@/lib/bridge';
import { useState } from 'react';

export default function ProfileLists({
  username,
  variant,
  data
}: {
  username: string;
  variant: string;
  data: FollowList[] | undefined;
}) {
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
              What Is This?
            </AccordionTrigger>
            <AccordionContent>
              This is the new decentralized list system. From here you can manage your own mute list or
              blacklist, as well as subscribe to the mute lists and blacklists of other users. There are some
              new fields on the{' '}
              <Link href={`/@/settings`} className="text-red-600">
                Settings
              </Link>{' '}
              page where you can set a description of how you choose who you&apos;ve added to your lists and
              if there are any actions that account can take to get removed from them. You can see the
              descriptions of the lists of other accounts by browsing directly to their personal blacklist or
              mute list page. These links can be found on their profile page below the follower information.
              To get started, we recommend that you follow the blacklists/mute lists of these accounts:
              hive.blog
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <h1 className="text-xl font-bold">
          {variant === 'blacklisted'
            ? `Accounts Blacklisted By ${username}`
            : variant === 'muted'
            ? `Accounts Muted  ${username}`
            : variant === 'followedBlacklist'
            ? 'Followed Blacklists'
            : variant === 'followedMut'
            ? 'Followed Muted LIsts'
            : null}
        </h1>
        <p
          className={clsx('text-center text-xs', {
            hidden: variant === 'followedBlacklist' || variant === 'followedMut'
          })}
        >
          List Description: User hasn&apos;t added a description to their
          {variant === 'blacklisted' ? ' blacklist' : variant === 'muted' ? ' mute list' : null} yet
        </p>
        <ul className="flex flex-col sm:w-1/3">
          {data && data.length === 0 ? (
            <li className="bg-slate-200 p-4 text-center text-sm font-bold dark:bg-slate-900 ">
              There are no users on this list yet
            </li>
          ) : splitArrays.length > 0 ? (
            splitArrays[page].map((e: FollowList) => (
              <li
                key={e.name}
                className="w-full p-1 font-semibold odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900"
              >
                <Link className="text-red-600 " href={`/@${e.name}`}>
                  {e.name}
                </Link>
                {' ' + e.blacklist_description}
              </li>
            ))
          ) : null}
        </ul>
        {splitArrays.length > 1 ? (
          <div className="flex gap-2">
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
              FIRST
            </Button>{' '}
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(page - 1)}>
              PREVIOUS
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(page + 1)}
            >
              NEXT
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(splitArrays.length - 1)}
            >
              LAST
            </Button>
          </div>
        ) : null}
        {splitArrays.length > 1 ? (
          <div className="text-sm">
            Viewing Page {page + 1} of {splitArrays.length}
          </div>
        ) : null}
        {data && data.length > 0 ? <div className="text-sm">Users On List: {data.length}</div> : null}
        <h1 className="text-xl font-bold">Search This List</h1>
        <div className="flex  justify-center bg-slate-200 p-2 dark:bg-slate-900 sm:w-1/3">
          <Input onChange={(e) => onSearchChange(e.target.value)} className="bg-white sm:w-3/4"></Input>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold">Reset Options</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outlineRed" className="text-xs">
              RESET
              {variant === 'blacklisted'
                ? ' BLACKLIST'
                : variant === 'muted'
                ? ' MUTED LIST'
                : variant === 'followedBlacklist'
                ? ' FOLLOWED BLACKLISTS'
                : variant === 'followedMut'
                ? ' FOLLOWED MUTED LISTS'
                : null}
            </Button>
            <Button disabled size="sm" className="text-xs">
              RESET ALL FOLLOWS/LISTS
            </Button>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}
