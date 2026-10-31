'use client';

import type { ReactNode } from 'react';
import { CircleSpinner } from '@ui/components/circle-spinner';
import type { LiteDeleteMode } from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/blog/i18n/client';
import type { DiscussionParams } from '../post-rendering/lib/discussion-cache';
import { LiteDeleteDialog } from './lite-delete-dialog';
import type { LiteManageCapabilities } from './lite-ownership';
import { useLiteDeleteMutation } from './use-lite-manage-mutations';

export type LiteOwnerActionsProps = DiscussionParams & {
  entry: Entry;
  editing: boolean;
  onToggleEdit: () => void;
  onDeleted?: (mode: LiteDeleteMode) => void;
  separator: ReactNode;
  className: string;
};

/** The Edit and Delete buttons `LiteOwnerActions` loads for an owner, each preceded by `separator`. */
export default function LiteOwnerButtons({
  entry,
  editing,
  onToggleEdit,
  onDeleted,
  separator,
  className,
  canEdit,
  canDelete,
  ...discussion
}: LiteOwnerActionsProps & LiteManageCapabilities) {
  const { t } = useTranslation('common_blog');
  const deletion = useLiteDeleteMutation();

  const onConfirmDelete = () => {
    deletion.mutate({ ...discussion, entry }, { onSuccess: ({ mode }) => onDeleted?.(mode) });
  };

  return (
    <>
      {canEdit ? (
        <>
          {separator}
          <button type="button" disabled={deletion.isPending} onClick={onToggleEdit} className={className} data-testid="lite-edit">
            {t('cards.comment_card.edit')}
          </button>
        </>
      ) : null}
      {canDelete ? (
        <>
          {separator}
          <LiteDeleteDialog isPost={!entry.parent_author} onConfirm={onConfirmDelete}>
            <button type="button" disabled={editing || deletion.isPending} className={className} data-testid="lite-delete">
              {deletion.isPending ? <CircleSpinner loading size={18} color="#dc2626" /> : t('cards.comment_card.delete')}
            </button>
          </LiteDeleteDialog>
        </>
      ) : null}
    </>
  );
}
