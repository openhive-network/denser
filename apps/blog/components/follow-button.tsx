import { Button } from '@hive/ui';
import { useTranslation } from 'next-i18next';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';

const FollowButton = ({
  variant,
  loading,
  isFollow,
  onClick
}: {
  variant:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'outlineRed'
    | 'link'
    | 'redHover'
    | 'basic'
    | null
    | undefined;
  loading: boolean;
  isFollow: boolean;
  onClick: () => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Button
      className="hover:text-red-500 "
      variant={variant}
      size="sm"
      data-testid="profile-follow-button"
      onClick={() => onClick()}
      disabled={loading}
    >
      {loading ? (
        <span className="flex h-5 w-12 items-center justify-center">
          <CircleSpinner loading={loading} size={18} color="#dc2626" />
        </span>
      ) : isFollow ? (
        t('user_profile.unfollow_button')
      ) : (
        t('user_profile.follow_button')
      )}
    </Button>
  );
};
export default FollowButton;
