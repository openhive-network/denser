'use client';

import { Dialog, DialogTrigger } from '@ui/components/dialog';
import { useTranslation } from '@/blog/i18n/client';
import { Community } from '@transaction/lib/extended-hive.chain';
import { useState } from 'react';
import EditDialogContent from './edit-dialog-content';

const EditCommunityDialog = ({ data }: { data: Community }) => {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm text-destructive" disabled={data._temporary}>
        {t('communities.edit_props')}
      </DialogTrigger>
      <EditDialogContent data={data} setOpen={setOpen} />
    </Dialog>
  );
};

export default EditCommunityDialog;
