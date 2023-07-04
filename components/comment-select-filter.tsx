import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useRouter } from 'next/router';

const CommentSelectFilter = () => {
  const router = useRouter();
  const defaultSort = router.query.sort?.toString();
  return (
    <Select
      defaultValue={defaultSort ? defaultSort : 'trending'}
      onValueChange={(e) => {
        router.replace(`${router.asPath.split('#')[0].split('?')[0]}?sort=${e}#comments`);
      }}
    >
      <SelectTrigger className="w-fit border-none bg-transparent text-red-600" data-testid="posts-filter">
        <SelectValue placeholder="Sort:" />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          <SelectItem value="trending">Trending</SelectItem>
          <SelectItem value="votes">Votes</SelectItem>
          <SelectItem value="new">Age</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CommentSelectFilter;
