'use client';

import { configuredPasskeySigners } from '@ui/config/public-vars';
import { Button } from '@ui/components/button';
import Loading from '@ui/components/loading';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';
import { LITE_DID_PREFIX } from './lite-did';
import { formatChainDate, passkeyRoot, postingDevices, type DeviceRow } from './lite-authority-state';
import { useStoredLiteIdentityState } from './use-stored-lite-identity';
import { useLiteAuthority, useLitePasskeyAccess } from './use-lite-passkey';
import { usePasskeyFlow } from './use-passkey-flow';

type ItemProps = {
  row: DeviceRow;
  busy: boolean;
  editable: boolean;
  onRemove: () => void;
  onRenew: () => void;
};

function DeviceItem({ row, busy, editable, onRemove, onRenew }: ItemProps) {
  const { t, i18n } = useTranslation('common_blog');
  const until = row.effectiveUntil ?? row.expires;

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 py-3"
      data-testid="lite-device-row"
      data-key={row.key}
      data-current={row.current}
    >
      <div className="flex min-w-0 flex-col">
        <span className="font-medium" data-testid="lite-device-label">
          {row.label ?? t('lite_account.devices.unlabelled')}
          {row.current ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {t('lite_account.devices.this_device')}
            </span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground" data-testid="lite-device-until">
          {until
            ? t(row.active ? 'lite_account.devices.valid_until' : 'lite_account.devices.expired_on', {
                date: formatChainDate(until, i18n.language)
              })
            : t('lite_account.devices.no_expiry')}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground" translate="no">
          {row.key}
        </span>
      </div>
      <div className="flex gap-2">
        {editable && row.renewable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRenew}
            data-testid="lite-device-renew"
          >
            {t('lite_account.devices.renew')}
          </Button>
        ) : null}
        {!editable || row.current ? null : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={onRemove}
            data-testid="lite-device-remove"
          >
            {t('lite_account.devices.remove')}
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * The Devices tab of the browser's own lite account: every posting key on chain with its label and
 * validity. Once secured, another device's key can be removed, and this browser's renewed within
 * its last days, both signed by the passkey root in its signer.
 */
export default function LiteDevices({ did }: { did: string }) {
  const { t } = useTranslation('common_blog');
  const [stored, store] = useStoredLiteIdentityState();
  const { available, relay } = useLitePasskeyAccess();
  const authority = useLiteAuthority(stored?.name, available && `${LITE_DID_PREFIX}${stored?.name}` === did);
  const { run, pending } = usePasskeyFlow(stored?.name);

  if (!stored || !available || !relay) return null;
  if (`${LITE_DID_PREFIX}${stored.name}` !== did) {
    return <p className="p-4 text-sm text-muted-foreground">{t('lite_account.devices.not_owner')}</p>;
  }
  if (authority.isPending) return <Loading loading />;
  if (!authority.data) {
    return (
      <p className="p-4 text-sm text-muted-foreground">{t('lite_account.authority_errors.unavailable')}</p>
    );
  }
  const view = authority.data;
  const signer = stored.signer ?? passkeyRoot(view)?.signer ?? configuredPasskeySigners[0];
  const rows = postingDevices(view, stored.postingPublicKey, Date.now());

  const remove = (deviceKey: string) =>
    void run(signer, async (popup) => {
      if (!popup) return;
      const { removeDeviceWithRoot } = await import('./lite-authority-flows');
      await removeDeviceWithRoot({ identity: stored, deviceKey, popup, relay });
      toast({ title: t('lite_account.devices.removed') });
    });

  const renew = (deviceKey: string) =>
    void run(signer, async (popup) => {
      if (!popup) return;
      const { renewDeviceWithRoot } = await import('./lite-authority-flows');
      const deviceExpires = await renewDeviceWithRoot({ identity: stored, deviceKey, popup, relay });
      store({ ...stored, deviceExpires });
      toast({ title: t('lite_account.devices.renewed') });
    });

  return (
    <section className="flex flex-col gap-2 p-2" data-testid="lite-devices">
      <h2 className="text-lg font-semibold">{t('lite_account.devices.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('lite_account.devices.description')}</p>
      {pending ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('lite_account.passkey.working')}
        </p>
      ) : null}
      <ul className="divide-y">
        {rows.map((row) => (
          <DeviceItem
            key={row.key}
            row={row}
            busy={pending}
            editable={stored.secured}
            onRemove={() => remove(row.key)}
            onRenew={() => renew(row.key)}
          />
        ))}
      </ul>
    </section>
  );
}
