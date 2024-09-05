import { useLocalStorage } from 'usehooks-ts';
import { Button } from '@ui/components';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

type AccountFormValues = {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
};
const defaultValues = {
  title: '',
  postArea: '',
  postSummary: '',
  tags: '',
  author: '',
  category: ''
};
const NewPost = ({ name, disabled }: { name: string; disabled: boolean }) => {
  const { t } = useTranslation('common_blog');
  const [storedPost, storePost] = useLocalStorage<AccountFormValues>('postData', defaultValues);
  return (
    <Button
      size="sm"
      className="w-full bg-blue-600 p-0 text-center text-slate-50 hover:bg-blue-700"
      onClick={() => storePost({ ...storedPost, category: name })}
      data-testid="community-new-post-button"
      disabled={(disabled && !name.includes('hive-1')) || name.includes('hive-2') || name.includes('hive-3')}
    >
      <Link className="w-full p-2" href={`/submit.html?category=${name}`}>
        {t('communities.buttons.new_post')}
      </Link>
    </Button>
  );
};
export default NewPost;
