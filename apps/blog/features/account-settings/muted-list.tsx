import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useUnmuteMutation } from '@/blog/features/mute-follow/hooks/use-mute-mutations';
import { useTranslation } from '@/blog/i18n/client';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';

const MutedList = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const mutedQuery = useFollowListQuery(username, 'muted');
  const unmuteMutation = useUnmuteMutation();

  return mutedQuery.data ? (
    <div>
      <div>{t('settings_page.muted_users')}</div>
      <ul>
        {mutedQuery.data.map((mutedUser, index) => {
          const mute_item = unmuteMutation.isPending && unmuteMutation.variables?.username === mutedUser.name;
          return (
            <li key={mutedUser.name}>
              <span>{index + 1}. </span>
              <span className="text-destructive">{mutedUser.name}</span>
              <Button
                className="h-fit p-1 text-destructive"
                variant="link"
                onClick={async () => {
                  const params = { username: mutedUser.name };
                  try {
                    await unmuteMutation.mutateAsync(params);
                  } catch (error) {
                    handleError(error, { method: 'unmute', params });
                  }
                }}
                disabled={mute_item}
              >
                [
                {mute_item ? (
                  <span className="flex items-center justify-center">
                    <CircleSpinner loading={unmuteMutation.isPending} size={18} color="#dc2626" />
                  </span>
                ) : (
                  t('settings_page.unmute')
                )}
                ]
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  ) : null;
};

export default MutedList;
