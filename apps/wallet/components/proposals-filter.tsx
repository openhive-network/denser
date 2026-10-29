import * as React from 'react';
import clsx from 'clsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@ui/components/input';
import { TabsList, TabsTrigger } from '@ui/components/tabs';
import { IGetProposalsParams } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/wallet/i18n/client';
import {
  PROPOSAL_STATUS_LABEL_KEYS,
  PROPOSAL_STATUS_TABS,
  type ProposalStatusTab
} from '@/wallet/lib/proposals-list';
import { ProposalsStatusSelect } from '@/wallet/components/proposals-status-select';

export interface FilterProposalsProps {
  status: ProposalStatusTab;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  orderValue: IGetProposalsParams['order'];
  onChangeSortOrder: (value: FilterProposalsProps['orderValue']) => void;
  orderDirection: IGetProposalsParams['order_direction'];
  onOrderDirection: (value: FilterProposalsProps['orderDirection']) => void;
}
/**
 * The proposals page's filter bar. Its status tabs are the triggers of the page's `Tabs`, whose
 * value is the status filter, so the bar renders inside them. Below `md` a select bound to the same
 * status replaces the tabs, which wrap there; `display: none` keeps the hidden one out of the
 * accessibility tree.
 */
export function ProposalsFilter({
  status,
  onStatusChange,
  search,
  onSearchChange,
  onChangeSortOrder,
  orderValue,
  orderDirection,
  onOrderDirection
}: FilterProposalsProps) {
  const { t } = useTranslation('common_wallet');
  const orderByLabelId = React.useId();
  const orderByTriggerId = React.useId();
  const handleDirectionToggle = () =>
    onOrderDirection(orderDirection === 'descending' ? 'ascending' : 'descending');
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onSearchChange(event.target.value);

  return (
    <>
      <div className="flex flex-col justify-between gap-2 sm:my-1 sm:flex-row">
        <h1
          className="text-xl font-semibold sm:self-center md:text-2xl xl:text-3xl"
          data-testid="proposals-header-name"
        >
          {t('proposals_page.proposals')}
        </h1>
        <div className="flex justify-between" data-testid="proposals-sort-filter">
          <div className="flex gap-2 text-xs font-medium">
            <ProposalsStatusSelect value={status} onValueChange={onStatusChange} className="md:hidden" />
            <div>
              <span id={orderByLabelId}>{t('select_sort.sort_proposals.order_by')}</span>
              <Select defaultValue="" value={orderValue} onValueChange={onChangeSortOrder}>
                <SelectTrigger
                  id={orderByTriggerId}
                  aria-labelledby={`${orderByLabelId} ${orderByTriggerId}`}
                  className="h-[35px] w-auto min-w-[120px] gap-2"
                  data-testid="proposals-sort-filter-orderby"
                >
                  <SelectValue placeholder={t('global.select_placeholder')} />
                </SelectTrigger>
                <SelectContent data-testid="proposals-sort-filter-orderby-conntent">
                  <SelectGroup>
                    <SelectItem value="by_creator">{t('select_sort.sort_proposals.creator')}</SelectItem>
                    <SelectItem value="by_start_date">
                      {t('select_sort.sort_proposals.start_date')}
                    </SelectItem>
                    <SelectItem value="by_end_date">{t('select_sort.sort_proposals.end_date')}</SelectItem>
                    <SelectItem value="by_total_votes">
                      {t('select_sort.sort_proposals.total_votes')}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <button
            type="button"
            aria-label={t('select_sort.sort_proposals.sort_ascending')}
            aria-pressed={orderDirection === 'ascending'}
            onClick={handleDirectionToggle}
            className={clsx('flex self-end transition-transform', {
              'rotate-180': orderDirection === 'ascending'
            })}
            data-testid="proposals-sort-filter-order-direction"
          >
            <Icons.arrowBigDown className="m-1 h-8 w-8 text-red-500 transition-transform" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TabsList
          aria-label={t('select_sort.sort_proposals.status')}
          className="hidden h-auto flex-wrap justify-start bg-slate-200 dark:bg-slate-900 md:inline-flex"
          data-testid="proposals-status-tabs"
        >
          {PROPOSAL_STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-950 dark:text-slate-300 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white"
              data-testid={`proposals-status-tab-${tab}`}
            >
              {t(PROPOSAL_STATUS_LABEL_KEYS[tab])}
            </TabsTrigger>
          ))}
        </TabsList>
        <Input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder={t('proposals_page.search_placeholder')}
          aria-label={t('proposals_page.search_label')}
          className="h-[35px] placeholder:text-slate-600 dark:placeholder:text-muted-foreground sm:max-w-xs"
          data-testid="proposals-search"
        />
      </div>
    </>
  );
}
