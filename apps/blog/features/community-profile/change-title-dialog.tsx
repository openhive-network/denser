import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Separator } from '@ui/components';
import { PenTool } from 'lucide-react';
import { useState } from 'react';
import { useUserTitleMutation } from './hooks/use-user-title';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from 'next-i18next';
import ChangeTitleData from './change-title-data';

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
  const titleMutation = useUserTitleMutation();

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
          <ChangeTitleData
            title={title}
            handlerOpen={setOpen}
            titleMutation={titleMutation}
            community={community}
            userOnList={userOnList}
            permlink={permlink}
          />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ) : null;
};

export default ChangeTitleDialog;
