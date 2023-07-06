import { useRouter } from 'next/router';
import CustomSelect from '@/components/ui/custom-select';

export interface FilterOptionComments {
  readonly value: string;
  readonly label: string;
}

export const filterOptionComments: readonly FilterOptionComments[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'votes', label: 'Votes' },
  { value: 'new', label: 'Age' }
];

const CommentSelectFilter = () => {
  const router = useRouter();
  const defaultSort = router.query.sort?.toString();
  return (
    <CustomSelect
      defaultValue={defaultSort}
      options={filterOptionComments}
      onChange={(e: { value: string; label: string }) => {
        router.replace(`${router.asPath.split('#')[0].split('?')[0]}?sort=${e.value}#comments`);
      }}
    />
  );
};

export default CommentSelectFilter;
