import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
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
const NewPost = ({ name }: { name: string }) => {
  const { t } = useTranslation('common_blog');
  const [storedPost, storePost] = useLocalStorage<AccountFormValues>('postData', defaultValues);

  return (
    <Button
      size="sm"
      className="w-full bg-blue-800 text-center hover:bg-blue-900"
      onClick={() => storePost({ ...storedPost, tags: name, category: name })}
      data-testid="community-new-post-button"
    >
      <Link href={`/submit.html?category=${name}`}>{t('communities.buttons.new_post')}</Link>
    </Button>
  );
};
export default NewPost;
