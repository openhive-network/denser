import { Button } from '@hive/ui';
import { useTranslation } from 'next-i18next';
import { CircleSpinner } from 'react-spinners-kit';

const MuteButton = ({
  variant,
  loading,
  isMute,
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
  isMute: boolean;
  onClick: () => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Button
      className=" hover:text-destructive"
      variant={variant}
      size="sm"
      data-testid="profile-mute-button"
      onClick={() => onClick()}
      disabled={loading}
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
