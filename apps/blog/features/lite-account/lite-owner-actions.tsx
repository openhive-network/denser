'use client';

import dynamic from 'next/dynamic';
import type { LiteOwnerActionsProps } from './lite-owner-buttons';
import { liteL1Author } from './lite-ownership';
import { useLiteManageCapabilities } from './use-lite-owner';

// The buttons bring the delete dialog and the edit/delete signing; only an owner loads them.
const LiteOwnerButtons = dynamic(() => import('./lite-owner-buttons'), { ssr: false });
const LiteForeignGatewayNote = dynamic(() => import('./lite-foreign-gateway-note'), { ssr: false });

/**
 * Edit and Delete for the lite owner of `entry` (this browser's identity wrote it), each when the
 * gateway's /info.features offers it, or a note when another gateway posted it; nothing for anyone
 * else. Each button or the note is preceded by `separator`.
 */
export function LiteOwnerActions(props: LiteOwnerActionsProps) {
  const { canEdit, canDelete, foreignGateway } = useLiteManageCapabilities(props.entry);
  const gateAccount = foreignGateway ? liteL1Author(props.entry) : undefined;
  if (gateAccount) return <LiteForeignGatewayNote gateAccount={gateAccount} separator={props.separator} />;
  if (!canEdit && !canDelete) return null;
  return <LiteOwnerButtons {...props} canEdit={canEdit} canDelete={canDelete} />;
}
