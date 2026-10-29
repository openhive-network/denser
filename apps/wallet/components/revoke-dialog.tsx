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
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { toast } from '@ui/components/hooks/use-toast';
import { getAsset } from '@transaction/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';

const RevokeDialog = ({ delegator, delegatee }: { delegator: string; delegatee: string }) => {
  const { t } = useTranslation('common_wallet');
  const [open, setOpen] = useState(false);
  const delegateMutation = useDelegateMutation();
  const onRevoke = async () => {
    delegateMutation.mutate({
      delegator: delegator,
      delegatee: delegatee,
      hp: await getAsset('0', 'HIVE')
    });
    delegateMutation.isError &&
      toast({
        variant: 'destructive',
        title: t('global.something_went_wrong'),
        description: t('delegations_page.revoke_failed')
      });
    delegateMutation.isSuccess && setOpen(false);
  };
  const loading = delegateMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outlineRed">{t('delegations_page.revoke')}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('global.close')}>
        <DialogHeader>
          <DialogTitle>{t('delegations_page.confirm_revoke')}</DialogTitle>
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
            <Label className="text-right">HIVE</Label>
            <Input disabled value={0} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="redHover" className="px-6" onClick={onRevoke} disabled={loading}>
            {loading ? <CircleSpinner loading={loading} size={18} color="#dc2626" /> : t('transfers_page.ok')}
          </Button>
          <div className="grow" />
          <Button variant="link" onClick={() => setOpen(false)} disabled={loading}>
            {t('transfers_page.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevokeDialog;
