'use client';

import { Link } from '@hive/ui';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';
import { graduationAmount } from './lite-graduation-state';
import type { StoredLiteIdentity } from './lite-identity-record';
import { useLiteGraduationOffer } from './use-lite-graduation-offer';

type Props = {
  identity: StoredLiteIdentity;
  /** Opens the graduation dialog; `pendingLink` opens it on the link retry for that account. */
  onUpgrade: (pendingLink?: string) => void;
  /** Opens the Login dialog on the "Passkey signer" sign-in for `account`. */
  onSignInAs: (account: string) => void;
};

/**
 * The identity menu's graduation items, mounted with the open menu (the gateway is asked only
 * then): the upgrade with the ledger amount, disabled with the progress below the threshold; once
 * graduated, the account and the suggestion to sign in as it (and Finish the upgrade while the
 * gateway does not show the link). Nothing where the gateway does not graduate.
 */
export default function LiteGraduationMenuItems({ identity, onUpgrade, onSignInAs }: Props) {
  const { t } = useTranslation('common_blog');
  const offer = useLiteGraduationOffer(identity, true);
  const account = identity.graduated ?? (offer?.kind === 'linked' ? offer.account : undefined);

  if (account) {
    return (
      <>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href={`/@${account}`} className="flex w-full items-center" data-testid="lite-identity-graduated">
            <Icons.arrowUpCircle className="mr-2" />
            <span className="w-full">{t('lite_account.graduation.now_account', { account })}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onSignInAs(account)} data-testid="lite-identity-sign-in-as">
          <Icons.keyRound className="mr-2" />
          <span className="w-full">{t('lite_account.graduation.sign_in_as', { account })}</span>
        </DropdownMenuItem>
        {offer && offer.kind !== 'linked' && identity.graduated ? (
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onUpgrade(account)} data-testid="lite-identity-finish-upgrade">
            <Icons.link className="mr-2" />
            <span className="w-full">{t('lite_account.graduation.finish')}</span>
          </DropdownMenuItem>
        ) : null}
      </>
    );
  }
  if (offer?.kind !== 'eligible' && offer?.kind !== 'progress') return null;
  const eligible = offer.kind === 'eligible';
  return (
    <DropdownMenuItem
      className={eligible ? 'cursor-pointer' : undefined}
      disabled={!eligible}
      onSelect={() => onUpgrade()}
      data-testid="lite-identity-upgrade"
    >
      <Icons.arrowUpCircle className="mr-2" />
      <span className="flex w-full flex-col">
        {t('lite_account.graduation.upgrade')}
        <span className="text-xs text-muted-foreground" data-testid="lite-identity-upgrade-amount">
          {graduationAmount(t, offer)}
        </span>
      </span>
    </DropdownMenuItem>
  );
}
