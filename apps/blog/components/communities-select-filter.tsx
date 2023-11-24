import { useState } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { useTranslation } from 'next-i18next';

const CommunitiesSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: string;
  handleChangeFilter: (e: string) => void;
}) => {
const { t } = useTranslation('common_blog')
const [state, setState] = useState(() => filter);
  return (
    <Select
      defaultValue="rank"
      value={state}
      onValueChange={(e) => {
        handleChangeFilter(e);
        setState(e);
      }}
    >
      <SelectTrigger
        className="w-fit bg-white dark:bg-background/95 dark:text-white"
        data-testid="communities-filter"
      >
        <SelectValue placeholder="Select a filter" />
      </SelectTrigger>
      <SelectContent data-testid="communities-filter-item">
        <SelectGroup>
          <SelectItem value="rank">{t('select_sort.communitie_sort.rank')}</SelectItem>
          <SelectItem value="subs">{t('select_sort.communitie_sort.subscribers')}</SelectItem>
          <SelectItem value="new">{t('select_sort.communitie_sort.new')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CommunitiesSelectFilter;
