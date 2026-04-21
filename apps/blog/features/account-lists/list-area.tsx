import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Link } from '@hive/ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import clsx from 'clsx';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { useResetAllListsMutation } from '@/blog/components/hooks/use-reset-mutations';
import { Search, UserPlus } from 'lucide-react';
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
    if (resetAllListsMutation.isPending || resetListIsLoading) {
      setDisabled(true);
    } else {
      setTimeout(() => {
        setDisabled(false);
      }, 3000);
    }
  }, [resetAllListsMutation.isPending, resetListIsLoading]);
  const resetAll = async () => {
    try {
      await resetAllListsMutation.mutateAsync();
    } catch (error) {
      handleError(error, { method: 'resetAll', params: {} });
    }
  };
  const [page, setPage] = useState(0);
  const [addValue, setAddValue] = useState('');
  const totalItems = data?.filter((e) => e.name !== 'null').length ?? 0;

  return (
    <div
      data-testid="user-list-area"
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-4"
    >
      <Accordion type="single" collapsible className="w-full text-center">
        <AccordionItem value="item-1">
          <AccordionTrigger className="justify-center text-center text-sm text-primary/60">
            {t('user_profile.lists.list.what_is_this')}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-primary/70">
            {t('user_profile.lists.list.show_or_hide_descripton_one')}
            <Link href={`/@/settings`} className="text-destructive hover:underline">
              {t('user_profile.lists.list.settings')}
            </Link>
            {t('user_profile.lists.list.show_or_hide_descripton_two')}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <h1 data-testid="user-list-title" className="text-xl font-bold">
        {titleBy}
      </h1>
      <p
        className={clsx('text-center text-xs text-primary/60', {
          hidden: !listDescription
        })}
      >
        {t('user_profile.lists.list.list_description')}
        {listDescription ?? t('user_profile.lists.list.description_not_added')}
      </p>

      {/* List */}
      <ul
        data-testid="user-list-container"
        className="w-full rounded-md border border-border-primary/30"
      >
        {data && data.length === 0 && !isLoading ? (
          <li
            data-testid="user-list-empty"
            className="px-4 py-8 text-center text-sm text-primary/50"
          >
            {t('user_profile.lists.list.empty_list')}
          </li>
        ) : splitArrays.length > 0 ? (
          splitArrays[page].map((e: IFollowList) => (
            <ListItem
              item={e}
              loading={resetListIsLoading}
              accountOwner={accountOwner}
              listTitle={listTitle}
              variant={variant}
              key={e.name}
            />
          ))
        ) : null}
        {isLoading ? (
          <li className="flex items-center justify-center py-4">
            <CircleSpinner loading={isLoading} size={18} color="#dc2626" />
          </li>
        ) : null}
      </ul>

      {/* Pagination */}
      {splitArrays.length > 1 ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
              {t('user_profile.lists.list.first_button')}
            </Button>
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
          <span className="text-xs text-primary/50">
            {t('user_profile.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
            {' \u00B7 '}
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>
      ) : totalItems > 0 ? (
        <span className="text-xs text-primary/50">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      ) : null}

      {/* Add account */}
      {accountOwner ? (
        <div className="flex w-full flex-col items-center gap-2 border-t border-border-primary/30 pt-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="h-4 w-4" />
            {t('user_profile.lists.list.add_account_to_list')}
          </h2>
          <span className="text-xs text-primary/50">{t('user_profile.lists.list.single_account')}</span>
          <div className="flex w-full gap-2">
            <Input
              className="bg-background"
              placeholder="username"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value.trim())}
              disabled={resetListIsLoading || resetAllListsMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addValue && !isLoading && !disabled) {
                  handleAdd(addValue);
                  setAddValue('');
                }
              }}
            />
            {addValue || isLoading ? (
              <Button
                disabled={isLoading || disabled}
                className="min-w-[90px] shrink-0"
                onClick={() => {
                  handleAdd(addValue);
                  setAddValue('');
                }}
              >
                {isLoading ? (
                  <CircleSpinner loading={isLoading} size={16} color="#fff" />
                ) : (
                  t('user_profile.lists.list.add_to_list')
                )}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Search */}
      <div className="flex w-full flex-col items-center gap-2 border-t border-border-primary/30 pt-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Search className="h-4 w-4" />
          {t('user_profile.lists.list.search_this_list')}
        </h2>
        <div className="w-full">
          <Input
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-background"
            placeholder={t('user_profile.lists.list.search_this_list')}
          />
        </div>
      </div>

      {/* Reset options */}
      {accountOwner ? (
        <div className="flex w-full flex-col items-center gap-2 border-t border-border-primary/30 pt-4">
          <h2 className="text-base font-bold">{t('user_profile.lists.list.reset_options')}</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                handleReset();
              }}
              size="sm"
              variant="outlineRed"
              className="min-w-[120px] text-xs"
              disabled={disabled}
            >
              {resetListIsLoading || resetAllListsMutation.isPending ? (
                <CircleSpinner loading={disabled} size={18} color="#dc2626" />
              ) : (
                resetTitle
              )}
            </Button>
            <Button
              disabled={disabled}
              onClick={resetAll}
              size="sm"
              className="min-w-[120px] text-xs"
            >
              {resetAllListsMutation.isPending ? (
                <CircleSpinner loading={resetAllListsMutation.isPending} size={18} color="#dc2626" />
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
