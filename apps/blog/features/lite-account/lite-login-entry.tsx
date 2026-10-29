'use client';

import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import { useLiteApiInfo } from './use-lite-api-info';
import { useLitePasskeyAccess } from './use-lite-passkey';

type Props = { onSignIn: () => void };

function LitePasskeySignInLink({ onSignIn }: Props) {
  const { t } = useTranslation('common_blog');
  const { available } = useLitePasskeyAccess();
  if (!available) return null;

  return (
    <div className="flex flex-col gap-3 px-6 pb-6">
      <div className="border-t" role="separator" />
      <Button
        type="button"
        variant="link"
        className="h-auto justify-center whitespace-normal p-0 text-sm"
        onClick={onSignIn}
        data-testid="login-lite-passkey"
      >
        {t('lite_account.passkey.login_dialog_link')}
      </Button>
    </div>
  );
}

/**
 * The Login dialog's way into a passkey-secured lite account, under the Hive sign-in form: shown
 * where the API node is known to be lite-aware and the gateway relays authority edits. The gateway
 * is asked only on a lite-aware node, so a Hive-only deployment's Login dialog makes no lite request.
 */
export default function LiteLoginEntry({ onSignIn }: Props) {
  if (!useLiteApiInfo()) return null;
  return <LitePasskeySignInLink onSignIn={onSignIn} />;
}
