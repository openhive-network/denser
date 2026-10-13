'use client';

import { useTranslation } from '@/wallet/i18n/client';
import { Button, Dialog, DialogContent, DialogFooter } from '@ui/components';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useCancelPowerDownMutation } from '@/wallet/components/hooks/use-power-hive-mutation';
import { handleError } from '@ui/lib/handle-error';
import { toast } from '@ui/components/hooks/use-toast';
import type { BalanceActionDialogProps } from './balance-menu';

export function CancelPowerDownDialog({
  username,
  open,
  onOpenChange,
  onCloseAutoFocus
}: BalanceActionDialogProps & { username: string }) {
  const { t } = useTranslation('common_wallet');
  const cancelPowerDownMutation = useCancelPowerDownMutation();

  const cancelPowerDown = async () => {
    const params = { account: username };
    try {
      await cancelPowerDownMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'withdraw_vesting', params });
    } finally {
      onOpenChange(false);
      toast({
        title: t('transfers_page.transaction_success'),
        description: t('transfers_page.cancel_power_down'),
        variant: 'success'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="text-left sm:max-w-[425px]"
        aria-label={t('profile.cancel_power_down')}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {t('profile.cancel_power_down_prompt')}
        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          <Button variant="redHover" onClick={cancelPowerDown} disabled={cancelPowerDownMutation.isPending}>
            {cancelPowerDownMutation.isPending ? (
              <CircleSpinner loading={cancelPowerDownMutation.isPending} size={18} color="#dc2626" />
            ) : (
              t('profile.cancel_power_down')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
