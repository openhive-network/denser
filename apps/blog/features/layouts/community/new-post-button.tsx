import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { Button } from '@ui/components';
import { Link } from '@hive/ui';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '../../../i18n/client';

type AccountFormValues = {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
};
const NewPost = ({ name, disabled }: { name: string; disabled: boolean }) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  // User preferences are permanent (no TTL) - use empty key when not logged in
  const [preferences] = useStorageWithTTL<Preferences>(
    user.username ? `user-preferences-${user.username}` : '',
    DEFAULT_PREFERENCES,
    StorageTTL.PERMANENT
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
  // Post drafts expire after 30 days - use empty key when not logged in
  const [storedPost, storePost] = useStorageWithTTL<AccountFormValues>(
    user.username ? `postData-new-${user.username}` : '',
    defaultValues,
    StorageTTL.DRAFT
  );
  return (
    <Button
      size="sm"
      className="w-full bg-brand p-0 text-center text-brand-foreground hover:bg-brand/90"
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
