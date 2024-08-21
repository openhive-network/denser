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
import { PenTool } from 'lucide-react';
import { useState } from 'react';
import { useUserTitleMutation } from './hooks/use-user-title';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from 'next-i18next';

const ChangeTitleDialog = ({
  moderateEnabled,
  userOnList,
  title,
  community,
  permlink
}: {
  moderateEnabled: Boolean;
  userOnList: string;
  title: string;
  community: string;
  permlink: string;
}) => {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(title);
  const titleMutation = useUserTitleMutation();
  const onSave = async () => {
    setOpen(false);
    try {
      await titleMutation.mutateAsync({
        community: community,
        username: userOnList,
        title: text,
        permlink: permlink
      });
    } catch (error) {
      handleError(error, {
        method: 'setUserTitle',
        params: { community: community, username: userOnList, title: text }
      });
    }
  };
  return moderateEnabled ? (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger>
        {titleMutation.isLoading ? (
          <div className="ml-2">
            <CircleSpinner loading={titleMutation.isLoading} size={18} color="#dc2626" />
          </div>
        ) : (
          <span title={t('communities.edit_title')}>
            <PenTool className="h-3 w-3 -rotate-90" />
          </span>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('communities.set_title_for_user', { username: userOnList })}</DialogTitle>
          <Separator />
          <div className="text-start">
            {t('communities.title')}
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <Button variant="redHover" className="w-fit justify-self-end" onClick={onSave}>
            {t('communities.save')}
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ) : null;
};

export default ChangeTitleDialog;
