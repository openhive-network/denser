import type { User } from '@smart-signer/types/common';
import type { LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { useLoginAuthority } from '@smart-signer/lib/auth/use-login-authority';
import { useSafeStorageLockState } from '@smart-signer/lib/auth/use-safe-storage-lock';
import { useTranslation } from '@/blog/i18n/client';

export interface LoginAuthorityLabels {
  authority: LoginAuthority;
  /** The keys the session holds, or the signer's name */
  chip: string;
  /** The account menu button's accessible name */
  accountMenu: string;
}

/** The header's words for what the session of `user` signs with. */
export function useLoginAuthorityLabels(user: User): LoginAuthorityLabels {
  const { t } = useTranslation('common_blog');
  const { username } = user;
  const authority = useLoginAuthority(user);
  const locked = useSafeStorageLockState(user) === 'locked';
  if (authority.kind === 'key') {
    // One key's name, or `posting_and_active`
    const keys = authority.keyTypes.join('_and_');
    const accountMenuKey = locked ? 'account_menu_key_locked' : 'account_menu_key';
    return {
      authority,
      chip: t(`navigation.user_menu.key_type.${keys}`),
      accountMenu: t(`navigation.user_menu.${accountMenuKey}.${keys}`, { username })
    };
  }
  const method = t(`navigation.user_menu.login_method.${authority.loginType}`);
  return {
    authority,
    chip: method,
    accountMenu: t('navigation.user_menu.account_menu_signer', { username, method })
  };
}
