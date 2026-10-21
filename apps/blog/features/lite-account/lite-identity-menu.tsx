'use client';

import { useState } from 'react';
import type { LiteIdentity } from '@hiveio/lite-account';
import { Link } from '@hive/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import DialogLogin from '@/blog/components/dialog-login';
import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { LITE_DID_PREFIX } from './lite-did';
import { LiteForgetDialog } from './lite-forget-dialog';
import { forgetLiteAccount, LITE_IDENTITY_STORAGE_KEY } from './lite-storage';
import { liteSocialApp } from '@transaction/lib/lite-api';
import { useLiteApiInfo } from './use-lite-api-info';

/**
 * The header's indicator of the lite account this browser holds, for a reader who is not signed
 * in: its avatar, name and badge, with a menu to view its profile (and its feed, where the node
 * serves the lite social graph), sign in with a Hive account instead, or forget it. Nothing when the browser holds none. Reads the stored identity directly,
 * so the header does not load the lite signing code (`useLiteIdentity`).
 */
export default function LiteIdentityMenu() {
  const { t } = useTranslation('common_blog');
  const [identity] = useStorageWithTTL<LiteIdentity | null>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgetOpen, setIsForgetOpen] = useState(false);
  const social = liteSocialApp(useLiteApiInfo()) !== null;

  if (!identity?.name) return null;
  const { name } = identity;
  const did = `${LITE_DID_PREFIX}${name}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full pr-1 hover:bg-accent"
            aria-label={t('lite_account.identity.menu_label', { name })}
            data-testid="lite-identity-button"
          >
            <UserAvatar username={did} size="small" className="mr-0 h-9 w-9" />
            <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline" translate="no" data-testid="lite-identity-name">
              {name}
            </span>
            <span className="hidden sm:inline">
              <LiteDidBadge />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-background-secondary" align="end" data-testid="lite-identity-menu">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span translate="no" data-testid="lite-identity-menu-name">
              {name}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{t('lite_account.identity.held_here')}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link href={`/@${did}`} className="flex w-full items-center" data-testid="lite-identity-profile">
              <Icons.user className="mr-2" />
              <span className="w-full">{t('lite_account.identity.view_profile')}</span>
            </Link>
          </DropdownMenuItem>
          {social ? (
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href={`/@${did}/feed`} className="flex w-full items-center" data-testid="lite-identity-feed">
                <Icons.list className="mr-2" />
                <span className="w-full">{t('lite_account.identity.my_feed')}</span>
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsLoginOpen(true)} data-testid="lite-identity-sign-in">
            <Icons.doorOpen className="mr-2" />
            <span className="w-full">{t('lite_account.identity.sign_in')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onSelect={() => setIsForgetOpen(true)}
            data-testid="lite-identity-forget"
          >
            <Icons.trash className="mr-2" />
            <span className="w-full">{t('lite_account.identity.forget')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which unmounts its content when it closes */}
      <DialogLogin open={isLoginOpen} onOpenChange={setIsLoginOpen} />
      <LiteForgetDialog name={name} open={isForgetOpen} onOpenChange={setIsForgetOpen} onConfirm={forgetLiteAccount} />
    </>
  );
}
