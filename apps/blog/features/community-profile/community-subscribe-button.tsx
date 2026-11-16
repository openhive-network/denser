import type { TFunction } from 'i18next';
import { Button } from '@ui/components/button';
import { CircleSpinner } from '@ui/components/circle-spinner';

interface CommunitySubscribeButtonProps {
  t: TFunction<'common_blog'>;
  subscribed: boolean;
  busy: boolean;
  disabled?: boolean;
  /** Seconds until the gateway takes another op; a disabled countdown button while set */
  retrySecondsLeft?: number | null;
  onClick: () => void;
}

/** Subscribe, or Joined / Leave, of a community: the button alone, the state and action come from the caller. */
export default function CommunitySubscribeButton({
  t,
  subscribed,
  busy,
  disabled = false,
  retrySecondsLeft = null,
  onClick
}: CommunitySubscribeButtonProps) {
  if (retrySecondsLeft !== null) {
    return (
      <Button size="sm" variant="outline" className="w-full" disabled data-testid="lite-social-retry">
        {t('lite_account.gateway.post_wait', { seconds: retrySecondsLeft })}
      </Button>
    );
  }
  const spinner = <CircleSpinner loading size={18} color="#dc2626" />;
  if (!subscribed) {
    return (
      <Button
        size="sm"
        className="w-full bg-blue-600 text-center text-slate-50 hover:bg-blue-700"
        data-testid="community-subscribe-button"
        disabled={busy || disabled}
        onClick={onClick}
      >
        {busy ? spinner : t('communities.buttons.subscribe')}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="group relative w-full border-blue-600 text-center text-blue-600 hover:border-destructive hover:bg-transparent hover:text-destructive"
      data-testid="community-join-leave-button"
      disabled={busy || disabled}
      onClick={onClick}
    >
      {busy ? (
        spinner
      ) : (
        <span>
          <span className="group-hover:hidden">{t('communities.buttons.joined')}</span>
          <span className="hidden group-hover:inline">{t('communities.buttons.leave')}</span>
        </span>
      )}
    </Button>
  );
}
