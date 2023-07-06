import CustomSelect from '@/components/ui/custom-select';
import { useEffect, useState } from 'react';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export const filterOption: readonly FilterOption[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'hot', label: 'Hot' },
  { value: 'created', label: 'New' },
  { value: 'payout', label: 'Payouts' },
  { value: 'muted', label: 'Muted' }
];

const PostSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: string;
  handleChangeFilter: React.Dispatch<any>;
}) => {
  const [state, setState] = useState<any>(filterOption.find((el) => el.value === filter));

  useEffect(() => {
    // setState(filterOption.filter((option) => option.value === filter)[0]);
    setState(filterOption.find((el) => el.value === filter));
  }, []);

  console.log('filter', filter);
  console.log(
    'filterOption.filter((option) => option.value === filter)[0].value',
    filterOption.filter((option) => option.value === filter)[0]
  );
  console.log('state', state);

  return (
    <CustomSelect
      value={state}
      options={filterOption}
      onChange={(e: { value: string; label: string }) => {
        handleChangeFilter(e.value);
        setState(e);
      }}
    />
  );
};

export default PostSelectFilter;
