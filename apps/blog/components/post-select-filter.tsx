import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';

const PostSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: string | null;
  handleChangeFilter: (e: string) => void;
}) => {
  const defaultValue = 'trending';
  return (
    <Select
      defaultValue={defaultValue}
      value={filter ? filter : defaultValue}
      onValueChange={(e) => {
        handleChangeFilter(e);
      }}
    >
      <SelectTrigger className="bg-white dark:bg-background/95 dark:text-white" data-testid="posts-filter">
        <SelectValue placeholder="Select a filter" />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          <SelectItem value="trending">Trending</SelectItem>
          <SelectItem value="hot">Hot</SelectItem>
          <SelectItem value="created">New</SelectItem>
          <SelectItem value="payout">Payouts</SelectItem>
          <SelectItem value="muted">Muted</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default PostSelectFilter;
