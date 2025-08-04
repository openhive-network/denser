import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import clsx from 'clsx';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { useResetAllListsMutation } from '@/blog/components/hooks/use-reset-mutations';
import ListItem from './list-item';

const ListArea = ({
  titleBy,
  listTitle,
  resetTitle,
  listDescription,
  data,
  isLoading,
  resetListIsLoading,
  accountOwner,
  splitArrays,
  variant,
  handleAdd,
  handleReset,
  onSearchChange
}: {
  titleBy: string;
  listTitle: string;
  resetTitle: string;
  listDescription?: string;
  data: IFollowList[] | undefined;
  isLoading: boolean;
  resetListIsLoading: boolean;
  accountOwner: boolean;
  splitArrays: IFollowList[][];
  variant: 'blacklisted' | 'muted' | 'followBlacklist' | 'followMutedList';
  handleAdd: (name: string) => void;
  handleReset: () => void;
  onSearchChange: (e: string) => void;
}) => {
  const { t } = useTranslation('common_blog');
  const resetAllListsMutation = useResetAllListsMutation();
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    if (resetAllListsMutation.isLoading || resetListIsLoading) {
      setDisabled(true);
    } else {
      setTimeout(() => {
        setDisabled(false);
      }, 3000);
    }
  }, [resetAllListsMutation.isLoading, resetListIsLoading]);
  const resetAll = async () => {
    try {
      await resetAllListsMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetAll', params: {} });
    }
  };
  const [page, setPage] = useState(0);
  const [addValue, setAddValue] = useState('');
  return (
    <div className="flex  flex-col items-center gap-4 p-4">
      <Accordion type="single" collapsible className="w-1/3 text-center">
        <AccordionItem value="item-1">
          <AccordionTrigger className="justify-center text-center text-xl ">
            {t('user_profile.lists.list.what_is_this')}
          </AccordionTrigger>
          <AccordionContent>
            {t('user_profile.lists.list.show_or_hide_descripton_one')}
            <Link href={`/@/settings`} className="text-destructive">
              {t('user_profile.lists.list.settings')}
            </Link>
            {t('user_profile.lists.list.show_or_hide_descripton_two')}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <h1 className="text-xl font-bold">{titleBy}</h1>
      <p
        className={clsx('text-center text-xs', {
          hidden: !listDescription
        })}
      >
        {t('user_profile.lists.list.list_description')}
        {listDescription ?? t('user_profile.lists.list.description_not_added')}
      </p>
      <ul className="flex flex-col ">
        {data && data.length === 0 && !isLoading ? (
          <li className="bg-background-tertiary p-4 text-center text-sm font-bold">
            {t('user_profile.lists.list.empty_list')}
          </li>
        ) : splitArrays.length > 0 ? (
          splitArrays[page].map((e: IFollowList) => (
            <ListItem
              item={e}
              loading={isLoading || resetListIsLoading}
              accountOwner={accountOwner}
              listTitle={listTitle}
              variant={variant}
              key={e.name}
            />
          ))
        ) : null}
        {isLoading ? (
          <li className="flex h-9 w-72 items-center justify-center bg-background-tertiary pl-2 pr-1">
            <CircleSpinner loading={isLoading} size={18} color="#dc2626" />
          </li>
        ) : null}
      </ul>
      {splitArrays.length > 1 ? (
        <div className="flex gap-2">
          <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
            {t('user_profile.lists.list.first_button')}
          </Button>{' '}
          <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(page - 1)}>
            {t('user_profile.lists.list.previous_button')}
          </Button>
          <Button
            variant="outlineRed"
            disabled={page === splitArrays.length - 1}
            size="sm"
            onClick={() => setPage(page + 1)}
          >
            {t('user_profile.lists.list.next_button')}
          </Button>
          <Button
            variant="outlineRed"
            disabled={page === splitArrays.length - 1}
            size="sm"
            onClick={() => setPage(splitArrays.length - 1)}
          >
            {t('user_profile.lists.list.last_button')}
          </Button>
        </div>
      ) : null}
      {splitArrays.length > 1 ? (
        <div className="text-sm">
          {t('user_profile.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
        </div>
      ) : null}
      {accountOwner ? (
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold">{t('user_profile.lists.list.add_account_to_list')}</h1>
          <span className="text-sm">{t('user_profile.lists.list.single_account')}</span>
          <div className="flex w-full justify-center bg-background-tertiary p-2">
            <Input
              className="bg-background sm:w-3/4"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              disabled={resetListIsLoading || resetAllListsMutation.isLoading}
            />
          </div>
          {addValue ? (
            <Button
              className="mt-2"
              disabled={isLoading || disabled}
              onClick={() => {
                handleAdd(addValue), setAddValue('');
              }}
            >
              {t('user_profile.lists.list.add_to_list')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <h1 className="text-xl font-bold">{t('user_profile.lists.list.search_this_list')}</h1>
      <div className="flex  justify-center bg-background-tertiary p-2 sm:w-1/3">
        <Input onChange={(e) => onSearchChange(e.target.value)} className="bg-background sm:w-3/4" />
      </div>
      {accountOwner ? (
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold">{t('user_profile.lists.list.reset_options')}</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                handleReset();
              }}
              size="sm"
              variant="outlineRed"
              className="text-xs"
              disabled={disabled}
            >
              {resetListIsLoading || resetAllListsMutation.isLoading ? (
                <span className="flex h-5 w-20 items-center justify-center">
                  <CircleSpinner loading={disabled} size={18} color="#dc2626" />
                </span>
              ) : (
                resetTitle
              )}
            </Button>
            <Button disabled={disabled} onClick={resetAll} size="sm" className="text-xs">
              {resetAllListsMutation.isLoading ? (
                <span className="flex h-5 w-20 items-center justify-center">
                  <CircleSpinner loading={resetAllListsMutation.isLoading} size={18} color="#dc2626" />
                </span>
              ) : (
                t('user_profile.lists.list.reset_all_lists')
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
export default ListArea;
