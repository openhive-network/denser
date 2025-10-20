import { Button } from '@hive/ui';
import { CircleSpinner } from 'react-spinners-kit';
import clsx from 'clsx';
import { useTranslation } from '@/blog/i18n/client';

const MuteButton = ({
  variant,
  loading,
  isMute,
  onClick,
  disabled
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
  isMute: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Button
      className={clsx('hover:text-destructive', {
        'text-destructive': disabled
      })}
      variant={variant}
      size="sm"
      data-testid="profile-mute-button"
      onClick={() => onClick()}
      disabled={loading || disabled}
    >
      {loading ? (
        <span className="flex h-5 w-12 items-center justify-center">
          <CircleSpinner loading={loading} size={18} color="#dc2626" />
        </span>
      ) : isMute ? (
        t('user_profile.unmute_button')
      ) : (
        t('user_profile.mute_button')
      )}
    </Button>
  );
};
export default MuteButton;
