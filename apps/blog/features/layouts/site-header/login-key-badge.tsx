import { Icons } from '@ui/components/icons';
import { KeyType } from '@smart-signer/types/common';
import type { LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { useTranslation } from '@/blog/i18n/client';

/**
 * A key in the avatar's corner while the session holds the active key. Visual only: the avatar
 * button's accessible name says the same.
 */
const LoginKeyBadge = ({ authority }: { authority: LoginAuthority }) => {
  const { t } = useTranslation('common_blog');
  if (authority.kind !== 'key' || authority.keyType !== KeyType.active) return null;

  return (
    <span
      aria-hidden="true"
      title={t('navigation.user_menu.active_key_badge')}
      className="absolute -bottom-0.5 -right-0.5 z-40 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
      data-testid="login-key-badge"
    >
      <Icons.keyRound className="h-2.5 w-2.5 text-destructive" />
    </span>
  );
};

export default LoginKeyBadge;
