'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
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
import DialogLogin from '@/blog/components/dialog-login';
import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { LITE_DID_PREFIX } from './lite-did';
import { LiteForgetDialog } from './lite-forget-dialog';
import type { StoredLiteIdentity } from './lite-identity-record';
import LiteSecurityNotice from './lite-security-notice';
import { forgetLiteAccount } from './lite-storage';
import { liteSocialApp } from '@transaction/lib/lite-api';
import { useLiteApiInfo } from './use-lite-api-info';
import { useLitePasskeyAccess, useLiteSecurityWarning } from './use-lite-passkey';
import LiteSecurePrompt, { useLiteSecurePrompt } from './lite-secure-prompt';
import { useStoredLiteIdentity } from './use-stored-lite-identity';
import { useLiteNotificationsAccount } from './use-lite-notifications';
import { useUnreadNotifications } from '@/blog/features/activity-log/hooks/use-unread-notifications';
import { useLiteGraduationAccess } from './use-lite-graduation';

// The passkey dialogs are loaded when opened: the header is on every page.
const LiteSecureDialog = dynamic(() => import('./lite-secure-dialog'), { ssr: false });
const LiteSignOutDialog = dynamic(() => import('./lite-sign-out-dialog').then((m) => m.LiteSignOutDialog), { ssr: false });
const LiteGraduationDialog = dynamic(() => import('./lite-graduation-dialog'), { ssr: false });
// Only a secured identity on a graduating gateway gets these: loaded when such a menu opens.
const LiteGraduationMenuItems = dynamic(() => import('./lite-graduation-menu-items'), { ssr: false });

/** The menu's security notice: mounted with the open menu, so the authority is read only then. */
function MenuSecurityNotice({ identity, onSecure }: { identity: StoredLiteIdentity; onSecure: () => void }) {
  const notice = useLiteSecurityWarning(identity, true);
  return <LiteSecurityNotice notice={notice} onSecure={onSecure} className="mx-2 mb-2" />;
}

/**
 * The header's indicator of the lite account this browser holds, for a reader who is not signed
 * in: its avatar, name and badge, with a menu to view its profile (and its feed, where the node
 * serves the lite social graph, and its notifications with the unread count where it serves lite
 * notifications), sign in with a Hive account instead, or forget it. Where the
 * gateway relays authority edits it also secures the account with a passkey (and says when it is
 * not), or signs a secured one out; where it graduates, it offers the upgrade to a Hive account and,
 * once graduated, signing in as that account. Nothing when the browser holds none. Reads the stored identity
 * directly, so the header does not load the lite signing code (`useLiteIdentity`).
 */
export default function LiteIdentityMenu() {
  const { t } = useTranslation('common_blog');
  const identity = useStoredLiteIdentity();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgetOpen, setIsForgetOpen] = useState(false);
  const [isSecureOpen, setIsSecureOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [graduation, setGraduation] = useState<{ pendingLink?: string } | null>(null);
  const [passkeyAccount, setPasskeyAccount] = useState<string | undefined>(undefined);
  const social = liteSocialApp(useLiteApiInfo()) !== null;
  const passkeyRelay = useLitePasskeyAccess().available;
  const openSecure = useCallback(() => setIsSecureOpen(true), []);
  const prompt = useLiteSecurePrompt(identity, passkeyRelay);
  const notificationsAccount = useLiteNotificationsAccount();
  const unread = useUnreadNotifications(notificationsAccount).data?.unread ?? 0;
  const graduates = useLiteGraduationAccess(identity).available;

  if (!identity) return null;
  const { name, secured } = identity;
  const secureFromMenu = () => {
    setIsMenuOpen(false);
    openSecure();
  };
  const passkey = passkeyRelay && identity.registered;
  const did = `${LITE_DID_PREFIX}${name}`;
  const openLogin = (account?: string) => {
    setPasskeyAccount(account);
    setIsLoginOpen(true);
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative flex items-center gap-1 rounded-full pr-1 hover:bg-accent"
            aria-label={t('lite_account.identity.menu_label', { name })}
            data-testid="lite-identity-button"
          >
            {unread > 0 ? (
              <span
                className="absolute left-7 top-0.5 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-destructive-icon px-1.5 py-1 text-xs font-bold leading-none text-white"
                data-testid="lite-identity-unread"
              >
                {unread}
              </span>
            ) : null}
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
          {passkey ? <MenuSecurityNotice identity={identity} onSecure={secureFromMenu} /> : null}
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
          {graduates ? (
            <LiteGraduationMenuItems
              identity={identity}
              onUpgrade={(pendingLink) => setGraduation({ pendingLink })}
              onSignInAs={openLogin}
            />
          ) : null}
          {notificationsAccount ? (
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href={`/@${did}/notifications`} className="flex w-full items-center" data-testid="lite-identity-notifications">
                <Icons.clock className="mr-2" />
                <span className="w-full">
                  {t('navigation.user_menu.notifications')}
                  {unread > 0 ? ` (${unread})` : null}
                </span>
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="cursor-pointer" onSelect={() => openLogin()} data-testid="lite-identity-sign-in">
            <Icons.doorOpen className="mr-2" />
            <span className="w-full">{t('lite_account.identity.sign_in')}</span>
          </DropdownMenuItem>
          {passkey && !secured && identity.ownerWif ? (
            <DropdownMenuItem className="cursor-pointer" onSelect={openSecure} data-testid="lite-identity-secure">
              <Icons.keyRound className="mr-2" />
              <span className="w-full">{t('lite_account.passkey.secure_action')}</span>
            </DropdownMenuItem>
          ) : null}
          {passkey && secured ? (
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsSignOutOpen(true)} data-testid="lite-identity-sign-out">
              <Icons.doorOpen className="mr-2" />
              <span className="w-full">{t('lite_account.passkey.sign_out')}</span>
            </DropdownMenuItem>
          ) : null}
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
      <DialogLogin
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        username={passkeyAccount}
        passkey={!!passkeyAccount}
      />
      <LiteForgetDialog
        name={name}
        variant={passkey ? (secured ? 'secured' : 'unsecured') : 'plain'}
        open={isForgetOpen}
        onOpenChange={setIsForgetOpen}
        onConfirm={forgetLiteAccount}
      />
      {prompt.prompting ? (
        <LiteSecurePrompt
          onDismiss={prompt.dismiss}
          onSecure={() => {
            prompt.dismiss();
            openSecure();
          }}
        />
      ) : null}
      {passkey && isSecureOpen ? <LiteSecureDialog open onOpenChange={setIsSecureOpen} /> : null}
      {passkey && isSignOutOpen ? <LiteSignOutDialog open onOpenChange={setIsSignOutOpen} /> : null}
      {graduates && graduation ? (
        <LiteGraduationDialog
          open
          onOpenChange={(open) => setGraduation(open ? graduation : null)}
          pendingLink={graduation.pendingLink}
        />
      ) : null}
    </>
  );
}
