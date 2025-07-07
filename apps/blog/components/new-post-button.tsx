import { useLocalStorage } from 'usehooks-ts';
import { Button } from '@ui/components';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';
import { useUser } from '@smart-signer/lib/auth/use-user';

type AccountFormValues = {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
};
const NewPost = ({ name, disabled }: { name: string; disabled: boolean }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );

  const defaultValues = {
    title: '',
    postArea: '',
    postSummary: '',
    tags: '',
    author: '',
    category: 'blog',
    beneficiaries: [],
    maxAcceptedPayout: preferences.blog_rewards === '0%' ? 0 : 1000000,
    payoutType: preferences.blog_rewards
  };
  const [storedPost, storePost] = useLocalStorage<AccountFormValues>(
    `postData-new-${user.username}`,
    defaultValues
  );
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
