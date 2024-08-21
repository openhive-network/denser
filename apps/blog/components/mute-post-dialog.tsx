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
import { handleError } from '@ui/lib/utils';
import { useMutePostMutation, useUnmutePostMutation } from '@/blog/components/hooks/use-mute-post-mutations';
import { CircleSpinner } from 'react-spinners-kit';
import clsx from 'clsx';

const MutePostDialog = ({
  comment,
  community,
  username,
  permlink,
  contentMuted
}: {
  comment: Boolean;
  community: string;
  username: string;
  permlink: string;
  contentMuted: Boolean;
}) => {
  const [text, setText] = useState<string>('');
  const [open, setOpen] = useState(false);
  const mutePost = useMutePostMutation();
  const unmutePost = useUnmutePostMutation();

  const mute = async () => {
    setOpen(false);
    try {
      await mutePost.mutateAsync({ community, username, permlink, notes: text });
    } catch (error) {
      handleError(error, { method: 'mute', params: { community, username, permlink, text } });
    }
  };
  const unmute = async () => {
    setOpen(false);
    try {
      await unmutePost.mutateAsync({ community, username, permlink, notes: text });
    } catch (error) {
      handleError(error, { method: 'unmute', params: { community, username, permlink, text } });
    }
  };
  return (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger asChild>
        {mutePost.isLoading || unmutePost.isLoading ? (
          <CircleSpinner loading={mutePost.isLoading || unmutePost.isLoading} size={18} color="#dc2626" />
        ) : (
          <button className={clsx("ml-2 flex items-center",{
            ' text-destructive':!comment
          })}>
            {contentMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contentMuted ? 'Unmute' : 'Mute'} post/comment</DialogTitle>
          <DialogDescription>
            Please provide a note regarding your decision to mute this content.
          </DialogDescription>
          <Separator />
          <div>
            Notes
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <Button
            variant="redHover"
            className="w-fit justify-self-end"
            onClick={contentMuted ? unmute : mute}
          >
            {contentMuted ? 'Unmute' : 'Mute'}
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default MutePostDialog;
