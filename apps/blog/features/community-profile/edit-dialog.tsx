'use client';

import { Dialog, DialogTrigger } from '@ui/components/dialog';
import { useTranslation } from '@/blog/i18n/client';
import { Community } from '@hive/common-hiveio-packages/wax';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// The form carries zod and wax's language enum; only community admins ever open it.
const EditDialogContent = dynamic(() => import('./edit-dialog-content'), { ssr: false });

const EditCommunityDialog = ({ data }: { data: Community }) => {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="text-sm text-destructive"
        disabled={data._temporary}
        data-testid="community-edit-props-trigger"
      >
        {t('communities.edit_props')}
      </DialogTrigger>
      <EditDialogContent data={data} setOpen={setOpen} />
    </Dialog>
  );
};

export default EditCommunityDialog;
