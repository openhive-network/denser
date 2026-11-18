import { Dialog } from '@ui/components/dialog';
import { useTranslation } from '@/wallet/i18n/client';
import type { VestingTotals } from '@/wallet/lib/voters';
import VotersDialogContent from './voters-dialog-content';
import WitnessVoters from './witness-voters';

interface WitnessVotersDialogProps {
  witness: string;
  /** The witness's vote total in HP. */
  totalHp: number;
  totals: VestingTotals;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}

/** The voters dialog of `witness`, opened from its row on the witness page. */
function WitnessVotersDialog({ witness, totalHp, totals, open, onOpenChange, onCloseAutoFocus }: WitnessVotersDialogProps) {
  const { t } = useTranslation('common_wallet');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <VotersDialogContent
        data-testid="witness-voters-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
        title={
          <>
            {t('voters_dialog.votes_for_witness')}{' '}
            <span className="text-red-500 dark:text-red-400" data-testid="witness-id-dialog">
              @{witness}
            </span>
          </>
        }
      >
        <WitnessVoters witness={witness} totalHp={totalHp} totals={totals} />
      </VotersDialogContent>
    </Dialog>
  );
}

export default WitnessVotersDialog;
