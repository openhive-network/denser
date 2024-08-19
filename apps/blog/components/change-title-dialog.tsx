import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Separator
} from '@ui/components';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useUserTitleMutation } from './hooks/use-user-title';
import { handleError } from '@ui/lib/utils';

const ChangeTitleDialog = ({
  moderateEnabled,
  userOnList,
  title,
  community
}: {
  moderateEnabled: Boolean;
  userOnList: string;
  title: string;
  community: string;
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(title);
  const titleMutation = useUserTitleMutation();
  const onSave = async () => {
    setOpen(false);
    try {
      await titleMutation.mutateAsync({ community: community, username: userOnList, title: text });
    } catch (error) {
      handleError(error, {
        method: 'unpin',
        params: { community: community, username: userOnList, title: text }
      });
    }
  };
  return moderateEnabled ? (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger>
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Title for @{userOnList}</DialogTitle>
          <Separator />
          <div className="text-start">
            Title
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <Button variant="redHover" className="w-fit justify-self-end" onClick={onSave}>
            Save
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ) : null;
};

export default ChangeTitleDialog;
