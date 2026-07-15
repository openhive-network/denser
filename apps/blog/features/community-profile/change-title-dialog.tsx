import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Separator } from '@ui/components';
import { PenTool } from 'lucide-react';
import { useState } from 'react';
import { useUserTitleMutation } from './hooks/use-user-title';
import { Icons } from '@ui/components/icons';
import ChangeTitleData from './change-title-data';
import { useTranslation } from '@/blog/i18n/client';

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
      <DialogTrigger data-testid="community-change-title-trigger">
        {titleMutation.isLoading ? (
          <div className="ml-2">
            <Icons.spinner className="h-[18px] w-[18px] animate-spin text-red-600" />
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
