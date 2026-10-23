'use client';

import { Link } from '@hive/ui';
import { useTranslation } from '@/blog/i18n/client';
import { expiresSoon, formatChainDate } from './lite-authority-state';
import { LITE_DID_PREFIX } from './lite-did';
import { useLitePasskeyAccess } from './use-lite-passkey';
import { useStoredLiteIdentity } from './use-stored-lite-identity';

/** The banner itself, once storage says the key expires soon: asks whether the gateway still renews. */
function ExpiryBanner({ name, expires }: { name: string; expires: string }) {
  const { t, i18n } = useTranslation('common_blog');
  if (!useLitePasskeyAccess().available) return null;

  return (
    <div
      className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100"
      role="status"
      data-testid="lite-device-expiry-banner"
    >
      {t('lite_account.devices.expiry_banner', { name, date: formatChainDate(expires, i18n.language) })}{' '}
      <Link
        href={`/@${LITE_DID_PREFIX}${name}/devices`}
        className="font-medium underline"
        data-testid="lite-device-expiry-link"
      >
        {t('lite_account.devices.expiry_banner_action')}
      </Link>
    </div>
  );
}

/**
 * A banner on every page while this browser's key of its secured lite account expires within the
 * renewal window, linking the Devices tab where the passkey renews it. Read from storage; the
 * gateway is asked only then.
 */
export default function LiteDeviceExpiryBanner() {
  const identity = useStoredLiteIdentity();
  const expires = identity?.secured ? identity.deviceExpires : undefined;
  if (!identity || !expires || !expiresSoon(expires, Date.now())) return null;
  return <ExpiryBanner name={identity.name} expires={expires} />;
}
