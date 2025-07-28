import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Separator
} from '@ui/components';
import { useState } from 'react';
import { handleError } from '@ui/lib/handle-error';
import { useMutePostMutation, useUnmutePostMutation } from '@/blog/components/hooks/use-mute-post-mutations';
import { CircleSpinner } from 'react-spinners-kit';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';

const MutePostDialog = ({
  comment,
  community,
  username,
  permlink,
  contentMuted,
  discussionAuthor,
  discussionPermlink,
  temporaryDisable
}: {
  comment: Boolean;
  community: string;
  username: string;
  permlink: string;
  contentMuted: Boolean;
  discussionPermlink: string;
  discussionAuthor: string;
  temporaryDisable?: boolean;
}) => {
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState<string>('');
  const [open, setOpen] = useState(false);
  const mutePost = useMutePostMutation();
  const unmutePost = useUnmutePostMutation();

  const mute = async () => {
    setOpen(false);
    try {
      await mutePost.mutateAsync({
        community,
        username,
        permlink,
        notes: text,
        discussionAuthor,
        discussionPermlink
      });
    } catch (error) {
      handleError(error, { method: 'mutePost', params: { community, username, permlink, text } });
    } finally {
      setText('');
    }
  };
  const unmute = async () => {
    setOpen(false);
    try {
      await unmutePost.mutateAsync({
        community,
        username,
        permlink,
        notes: text,
        discussionPermlink,
        discussionAuthor
      });
    } catch (error) {
      handleError(error, { method: 'unmutePost', params: { community, username, permlink, text } });
    } finally {
      setText('');
    }
  };
  return (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger
        asChild
        disabled={temporaryDisable}
        className={clsx('', {
          'animate-pulse cursor-not-allowed text-destructive': temporaryDisable
        })}
      >
        {mutePost.isLoading || unmutePost.isLoading ? (
          <CircleSpinner loading={mutePost.isLoading || unmutePost.isLoading} size={18} color="#dc2626" />
        ) : (
          <button
            className={clsx('ml-2 flex items-center', {
              ' text-destructive': !comment
            })}
          >
            {contentMuted ? t('communities.unmute') : t('communities.mute')}
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {(contentMuted ? t('communities.unmute') : t('communities.mute')) + t('communities.post_comment')}
          </DialogTitle>
          <DialogDescription>{t('communities.please_provide_a_note')}</DialogDescription>
          <Separator />
          <div>
            {t('communities.notes')}
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <Button
            variant="redHover"
            className="w-fit justify-self-end"
            onClick={contentMuted ? unmute : mute}
            disabled={text.length === 0}
          >
            {contentMuted ? t('communities.unmute') : t('communities.mute')}
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default MutePostDialog;
