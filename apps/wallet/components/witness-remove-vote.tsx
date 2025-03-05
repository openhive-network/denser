import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  Button
} from '@ui/components';
import { useTranslation } from 'next-i18next';
import { ReactNode, useState } from 'react';

interface WitnessRemoveVoteProps {
  onVote: (approve: boolean) => void;
  children: ReactNode;
}

const WitnessRemoveVote = ({ onVote, children }: WitnessRemoveVoteProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common_wallet');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>{t('witnesses_page.confirm_account_witness_vote')}</DialogHeader>
        <DialogDescription>{t('witnesses_page.you_are_about_remove_vote')}</DialogDescription>
        <DialogFooter className="flex flex-row justify-between pt-4">
          <Button
            variant="redHover"
            onClick={() => {
              onVote(false), setOpen(false);
            }}
          >
            {t('witnesses_page.ok')}
          </Button>
          <Button variant="outlineRed" onClick={() => setOpen(false)}>
            {t('witnesses_page.cancel_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default WitnessRemoveVote;
