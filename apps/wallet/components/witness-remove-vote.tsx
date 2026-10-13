'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter, Button } from '@ui/components';
import { useTranslation } from '@/wallet/i18n/client';

interface WitnessRemoveVoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVote: (approve: boolean) => void;
}

/**
 * Confirmation for removing a witness vote. It has no trigger of its own: the caller opens it, and
 * on close focus returns to the element that had it, so the vote control keeps keyboard focus.
 */
const WitnessRemoveVote = ({ open, onOpenChange, onVote }: WitnessRemoveVoteProps) => {
  const { t } = useTranslation('common_wallet');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>{t('witnesses_page.confirm_account_witness_vote')}</DialogHeader>
        <DialogDescription>{t('witnesses_page.you_are_about_remove_vote')}</DialogDescription>
        <DialogFooter className="flex flex-row justify-between pt-4">
          <Button
            variant="redHover"
            onClick={() => {
              onVote(false), onOpenChange(false);
            }}
          >
            {t('witnesses_page.ok')}
          </Button>
          <Button variant="outlineRed" onClick={() => onOpenChange(false)}>
            {t('witnesses_page.cancel_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default WitnessRemoveVote;
