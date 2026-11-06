import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label
} from '@ui/components';
import { useState } from 'react';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/wallet/i18n/client';
import { closesDialogOnFailure } from '@/wallet/lib/closes-dialog-on-failure';
import { useUndelegateMutation } from './hooks/use-undelegate-mutation';

/** Asks before revoking `delegator`'s RC delegation of `amount` (already formatted) to `delegatee`. */
const RevokeRcDialog = ({
  delegator,
  delegatee,
  amount
}: {
  delegator: string;
  delegatee: string;
  amount: string;
}) => {
  const { t } = useTranslation('common_wallet');
  const [open, setOpen] = useState(false);
  const undelegateMutation = useUndelegateMutation();
  const loading = undelegateMutation.isPending;
  const onRevokeError = (error: unknown) => {
    handleError(error, { method: 'undelegateRC', params: { delegator, delegatee } });
    if (closesDialogOnFailure(error)) setOpen(false);
  };
  const onRevoke = () => {
    undelegateMutation.mutate(delegatee, { onSuccess: () => setOpen(false), onError: onRevokeError });
  };
  const onCancel = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outlineRed" disabled={loading}>
          {loading ? (
            <span className="flex h-5 w-12 items-center justify-center">
              <CircleSpinner loading={loading} size={18} color="#dc2626" />
            </span>
          ) : (
            t('delegations_page.revoke')
          )}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('global.close')}>
        <DialogHeader>
          <DialogTitle>{t('delegations_page.revoke_rc_confirm', { account: delegatee })}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t('transfers_page.delegator')}</Label>
            <Input disabled value={delegator} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t('transfers_page.delegatee')}</Label>
            <Input disabled value={delegatee} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t('resource_credits.title')}</Label>
            <Input disabled value={amount} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="redHover" className="px-6" onClick={onRevoke} disabled={loading}>
            {loading ? <CircleSpinner loading={loading} size={18} color="#dc2626" /> : t('transfers_page.ok')}
          </Button>
          <div className="grow" />
          <Button variant="link" onClick={onCancel} disabled={loading}>
            {t('transfers_page.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevokeRcDialog;
