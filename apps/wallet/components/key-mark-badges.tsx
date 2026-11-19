import { badgeVariants } from '@ui/components/badge';
import { cn } from '@ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';
import type { KeyMarks } from './hooks/use-key-marks';

const MARKS = [
  { mark: 'session', label: 'account_keys.this_session', variant: 'lime' },
  { mark: 'safeStorage', label: 'account_keys.stored_in_browser', variant: 'outline' },
  { mark: 'passkey', label: 'account_keys.passkey_signer', variant: 'outline' }
] as const;

/** Badges naming which of the user's signers holds `publicKey`. */
const KeyMarkBadges = ({ publicKey, marks }: { publicKey: string; marks: KeyMarks }) => {
  const { t } = useTranslation('common_wallet');
  return (
    <>
      {MARKS.filter(({ mark }) => marks[mark].has(publicKey)).map(({ mark, label, variant }) => (
        <span
          key={mark}
          className={cn(badgeVariants({ variant }), 'shrink-0 whitespace-nowrap')}
          data-testid={`key-mark-${mark}`}
        >
          {t(label)}
        </span>
      ))}
    </>
  );
};

export default KeyMarkBadges;
