import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PostSelectFilter = ({filter, handleChangeFilter}: {filter: any, handleChangeFilter: any}) => {
  return (
      <Select
        defaultValue="trending"
        value={filter}
        onValueChange={(e) => {
          handleChangeFilter(e)
        }}
      >
        <SelectTrigger className="w-[180px] bg-white dark:bg-background/95 dark:text-white" data-testid="posts-filter">
          <SelectValue placeholder="Select a filter" />
        </SelectTrigger>
        <SelectContent data-testid="posts-filter-list">
          <SelectGroup>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="created">New</SelectItem>
            <SelectItem value="payout">Payout</SelectItem>
            <SelectItem value="promoted">Promoted</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
  )
}

export default PostSelectFilter;