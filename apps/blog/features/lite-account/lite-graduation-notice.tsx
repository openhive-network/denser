'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import { graduationAmount } from './lite-graduation-state';
import { useLiteGraduationAccess } from './use-lite-graduation';
import { useLiteGraduationOffer } from './use-lite-graduation-offer';
import { useStoredLiteIdentity } from './use-stored-lite-identity';

const LiteGraduationDialog = dynamic(() => import('./lite-graduation-dialog'), { ssr: false });

/**
 * The lite profile's graduation line, for the browser's own lite account where the gateway
 * graduates: "now @<account>" once graduated, else Upgrade with the ledger amount (disabled, with
 * the progress, below the threshold).
 */
export default function LiteGraduationNotice() {
  const { t } = useTranslation('common_blog');
  const identity = useStoredLiteIdentity();
  const { available } = useLiteGraduationAccess(identity);
  const offer = useLiteGraduationOffer(identity, true);
  const [open, setOpen] = useState(false);
  if (!available || !identity) return null;

  const account = identity.graduated ?? (offer?.kind === 'linked' ? offer.account : undefined);
  if (account) {
    return (
      <p className="mt-2 text-white/90" data-testid="lite-profile-graduated">
        {t('lite_account.graduation.profile_graduated')}{' '}
        <Link href={`/@${account}`} className="font-semibold underline" data-testid="lite-profile-graduated-link">
          @{account}
        </Link>
      </p>
    );
  }
  if (offer?.kind !== 'eligible' && offer?.kind !== 'progress') return null;
  const amount = graduationAmount(t, offer);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="lite-profile-upgrade">
      <Button
        size="sm"
        variant="outlineRed"
        disabled={offer.kind !== 'eligible'}
        onClick={() => setOpen(true)}
        data-testid="lite-profile-upgrade-button"
      >
        {t('lite_account.graduation.upgrade')}
      </Button>
      <span className="text-xs text-white/70" data-testid="lite-profile-upgrade-amount">
        {amount}
      </span>
      {open ? <LiteGraduationDialog open onOpenChange={setOpen} /> : null}
    </div>
  );
}
