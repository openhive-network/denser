import type { User } from '@smart-signer/types/common';
import { getLoginAuthority, type LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { useTranslation } from '@/blog/i18n/client';

export interface LoginAuthorityLabels {
  authority: LoginAuthority;
  /** The key the session holds, or the signer's name */
  chip: string;
  /** The account menu button's accessible name */
  accountMenu: string;
}

/** The header's words for what the session of `user` signs with. */
export function useLoginAuthorityLabels(user: User): LoginAuthorityLabels {
  const { t } = useTranslation('common_blog');
  const { username } = user;
  const authority = getLoginAuthority(user);
  if (authority.kind === 'key') {
    return {
      authority,
      chip: t(`navigation.user_menu.key_type.${authority.keyType}`),
      accountMenu: t(`navigation.user_menu.account_menu_key.${authority.keyType}`, { username })
    };
  }
  const method = t(`navigation.user_menu.login_method.${authority.loginType}`);
  return {
    authority,
    chip: method,
    accountMenu: t('navigation.user_menu.account_menu_signer', { username, method })
  };
}
