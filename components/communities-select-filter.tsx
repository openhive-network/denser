import { useState } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const CommunitiesSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: any;
  handleChangeFilter: any;
}) => {
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
      <SelectTrigger className="w-[180px] bg-white dark:bg-background/95 dark:text-white" data-testid="communities-filter">
        <SelectValue placeholder="Select a filter" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="rank">Rank</SelectItem>
          <SelectItem value="subs">Subscribers</SelectItem>
          <SelectItem value="new">New</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CommunitiesSelectFilter;
