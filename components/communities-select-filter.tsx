import { useState } from 'react';
import CustomSelect from '@/components/ui/custom-select';

export interface FilterOptionCommunities {
  readonly value: string;
  readonly label: string;
}

export const filterOptionCommunities: readonly FilterOptionCommunities[] = [
  { value: 'rank', label: 'Rank' },
  { value: 'subs', label: 'Subscribers' },
  { value: 'new', label: 'New' }
];

const CommunitiesSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: string;
  handleChangeFilter: React.Dispatch<any>;
}) => {
  const [state, setState] = useState(() => filter);
  return (
    <CustomSelect
      defaultValue={filterOptionCommunities[0]}
      options={filterOptionCommunities}
      onChange={(e: { value: string; label: string }) => {
        handleChangeFilter(e.value);
        setState(e.value);
      }}
    />
  );
};

export default CommunitiesSelectFilter;
