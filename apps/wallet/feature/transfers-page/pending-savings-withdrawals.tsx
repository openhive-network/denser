'use client';

import { useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import { SavingsWithdrawals } from '@hive/common-hiveio-packages/wax';
import { cn } from '@ui/lib/utils';
import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import { CircleSpinner } from 'react-spinners-kit';
import TimeAgo from '@hive/ui/components/time-ago';
import { getAmountFromWithdrawal } from '@/wallet/lib/utils';
import { useCancelTransferFromSavingsMutation } from '@/wallet/components/hooks/use-cancel-transfer-from-savings-mutation';
import { handleError } from '@ui/lib/handle-error';
import { toast } from '@ui/components/hooks/use-toast';

interface PendingSavingsWithdrawalsProps {
  username: string;
  withdrawals: SavingsWithdrawals | undefined;
}

const PendingSavingsWithdrawals = ({ username, withdrawals }: PendingSavingsWithdrawalsProps) => {
  const { t } = useTranslation('common_wallet');
  const [openCancelTransfer, setOpenCancelTransfer] = useState(false);
  const cancelTransferFromSavingsMutation = useCancelTransferFromSavingsMutation();

  const cancelTransferFromSavings = async (requestId: number) => {
    const params = { fromAccount: username, requestId: requestId };
    try {
      await cancelTransferFromSavingsMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'cancel_transfer_from_savings', params });
    } finally {
      setOpenCancelTransfer(false);
      toast({
        title: t('transfers_page.transaction_success'),
        description: t('transfers_page.cancel__transfer_from_savings'),
        variant: 'success'
      });
    }
  };

  if (!withdrawals?.withdrawals.length) return null;

  return (
    <div className="flex flex-col">
      <div className="p-2 font-semibold sm:p-4">{t('transfers_page.pending_savings')}</div>
      <table className="max-w-6xl text-sm">
        <tbody>
          {withdrawals.withdrawals.map((withdrawal, index) => {
            const withdrawMessage = `${t('transfers_page.withdraw')} ${getAmountFromWithdrawal(withdrawal)} ${t('transfers_page.to_lower')} ${withdrawal.to}`;
            return (
              <tr
                className={cn('flex flex-col py-2 sm:table-row', {
                  'bg-background-secondary': index % 2 === 0
                })}
                key={withdrawal.id}
              >
                <td className="px-2 sm:px-4 sm:py-2">
                  <TimeAgo date={withdrawal.complete} />
                </td>
                <td className="flex flex-row items-center px-2 sm:px-4 sm:py-2">
                  <div>{withdrawMessage}</div>
                  <Dialog open={openCancelTransfer} onOpenChange={setOpenCancelTransfer}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-destructive hover:no-underline">
                        {t('transfers_page.cancel')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="text-left sm:max-w-[425px]">
                      <div className="flex flex-col gap-y-2">
                        <div>{t('transfers_page.cancel_withdraw_request')}</div>
                        <div>{withdrawMessage}</div>
                      </div>
                      <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
                        <Button
                          variant="redHover"
                          onClick={() => cancelTransferFromSavings(withdrawal.request_id)}
                          disabled={cancelTransferFromSavingsMutation.isLoading}
                        >
                          {cancelTransferFromSavingsMutation.isLoading ? (
                            <CircleSpinner
                              loading={cancelTransferFromSavingsMutation.isLoading}
                              size={18}
                              color="#dc2626"
                            />
                          ) : (
                            t('transfers_page.cancel_withdraw_from_savings')
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PendingSavingsWithdrawals;
