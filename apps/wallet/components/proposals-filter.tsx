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
import { IGetProposalsParams } from '../lib/hive';
import { useTranslation } from 'next-i18next';

export interface FilterProposalsProps {
  filterStatus: IGetProposalsParams['status'];
  onChangeFilterStatus: (value: FilterProposalsProps['filterStatus']) => void;
  orderValue: IGetProposalsParams['order'];
  onChangeSortOrder: (value: FilterProposalsProps['orderValue']) => void;
  orderDirection: IGetProposalsParams['order_direction'];
  onOrderDirection: (value: FilterProposalsProps['orderDirection']) => void;
}
export function ProposalsFilter({
  onChangeFilterStatus,
  filterStatus,
  onChangeSortOrder,
  orderValue,
  orderDirection,
  onOrderDirection
}: FilterProposalsProps) {
  const { t } = useTranslation('common_wallet');
  const handleDirectionToggle = () =>
    onOrderDirection(orderDirection === 'descending' ? 'ascending' : 'descending');

  return (
    <div className="flex flex-col justify-between gap-2 sm:my-1 sm:flex-row">
      <h1
        className="text-xl font-semibold sm:self-center md:text-2xl xl:text-3xl"
        data-testid="proposals-header-name"
      >
        {t('proposals_page.proposals')}
      </h1>
      <div className="flex justify-between" data-testid="proposals-sort-filter">
        <div className="flex gap-2 text-xs font-medium">
          <div>
            <span>{t('select_sort.sort_proposals.status')}</span>
            <Select defaultValue="" value={filterStatus} onValueChange={onChangeFilterStatus}>
              <SelectTrigger className="h-[35px] w-[100px]" data-testid="proposals-sort-filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-testid="proposals-sort-filter-status-conntent">
                <SelectGroup>
                  <SelectItem value="all">{t('select_sort.sort_proposals.all')}</SelectItem>
                  <SelectItem value="active">{t('select_sort.sort_proposals.active')}</SelectItem>
                  <SelectItem value="inactive">{t('select_sort.sort_proposals.inactive')}</SelectItem>
                  <SelectItem value="expired">{t('select_sort.sort_proposals.expired')}</SelectItem>
                  <SelectItem value="votable">{t('select_sort.sort_proposals.votable')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <span>{t('select_sort.sort_proposals.order_by')}</span>
            <Select defaultValue="" value={orderValue} onValueChange={onChangeSortOrder}>
              <SelectTrigger className="h-[35px] w-[120px]" data-testid="proposals-sort-filter-orderby">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent data-testid="proposals-sort-filter-orderby-conntent">
                <SelectGroup>
                  <SelectItem value="by_creator">{t('select_sort.sort_proposals.creator')}</SelectItem>
                  <SelectItem value="by_start_date">{t('select_sort.sort_proposals.start_date')}</SelectItem>
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
  );
}
