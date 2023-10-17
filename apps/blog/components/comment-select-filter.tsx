import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const CommentSelectFilter = () => {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const defaultSort = router.query.sort?.toString();
  return (
    <Select
      defaultValue={defaultSort ? defaultSort : 'trending'}
      onValueChange={(e) => {
        router.replace(`${router.asPath.split('#')[0].split('?')[0]}?sort=${e}#comments`);
      }}
    >
      <SelectTrigger className='w-fit border-none bg-transparent text-red-600' data-testid='posts-filter'>
        <SelectValue placeholder='Sort:' />
      </SelectTrigger>
      <SelectContent data-testid='posts-filter-list'>
        <SelectGroup>
          <SelectItem value='trending'>{t('select_sort.sort_comments.trending')}</SelectItem>
          <SelectItem value='votes'>{t('select_sort.sort_comments.votes')}</SelectItem>
          <SelectItem value='new'>{t('select_sort.sort_comments.age')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CommentSelectFilter;
