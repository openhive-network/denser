'use client';

import dynamic from 'next/dynamic';
import type { LiteOwnerActionsProps } from './lite-owner-buttons';
import { useLiteManageCapabilities } from './use-lite-owner';

// The buttons bring the delete dialog and the edit/delete signing; only an owner loads them.
const LiteOwnerButtons = dynamic(() => import('./lite-owner-buttons'), { ssr: false });

/**
 * Edit and Delete for the lite owner of `entry` (this browser's identity wrote it), each when the
 * gateway's /info.features offers it; nothing for anyone else. Each button is preceded by `separator`.
 */
export function LiteOwnerActions(props: LiteOwnerActionsProps) {
  const { canEdit, canDelete } = useLiteManageCapabilities(props.entry);
  if (!canEdit && !canDelete) return null;
  return <LiteOwnerButtons {...props} canEdit={canEdit} canDelete={canDelete} />;
}
