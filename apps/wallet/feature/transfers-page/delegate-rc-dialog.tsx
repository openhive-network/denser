import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  DialogFooter,
  Input,
  Label
} from '@ui/components';
import { useDelegateRCMutation } from './hooks/use-delegate-mutation';
import { useEffect, useState } from 'react';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { Slider } from '@ui/components/slider';
import Big from 'big.js';

const SCALE = new Big(1_000_000_000);
const defaultForm = { toAccount: '', amount: '0' };

const DelegateRCDialog = ({ maxRC }: { maxRC: string }) => {
  const delegateMutation = useDelegateRCMutation();
  const [form, setForm] = useState(defaultForm);
  const bigMaxRaw = new Big(maxRC || '0');
  const bigMaxDisplay = bigMaxRaw.div(SCALE);
  const [open, setOpen] = useState(false);

  const toRawUnits = (displayAmountStr: string) => {
    if (displayAmountStr === '' || displayAmountStr === '0') return '0';
    return new Big(displayAmountStr).times(SCALE).toFixed(0);
  };

  const formatDisplay = (val: Big) => val.toFixed(9).replace(/\.?0+$/, ''); // show up to 9 decimals, trim trailing zeros

  const onDelegate = async () => {
    const displayAmt = form.amount === '' ? '0' : form.amount;
    const rawToSend = toRawUnits(displayAmt);
    try {
      await delegateMutation.mutateAsync({
        toAccount: form.toAccount,
        amount: rawToSend
      });
    } catch (error) {
      handleError(error, {
        method: 'delegate',
        params: { toAccount: form.toAccount, amount: rawToSend }
      });
    }
  };

  useEffect(() => {
    if (delegateMutation.isSuccess) {
      setOpen(false);
      setForm(defaultForm);
    }
  }, [delegateMutation.isSuccess]);

  const bigAmountDisplay =
    form.amount === ''
      ? new Big(0)
      : (() => {
          try {
            return new Big(form.amount);
          } catch {
            return new Big(0);
          }
        })();
  const isAmountValid = form.amount !== '' && bigAmountDisplay.gt(0) && bigAmountDisplay.lte(bigMaxDisplay);
  const isFormValid = isAmountValid && form.toAccount.trim().length > 0 && !delegateMutation.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outlineRed">Delegate RC</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegate RC</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="toAccount" className="text-sm font-medium">
              To Account
            </Label>
            <Input
              disabled={delegateMutation.isLoading}
              id="toAccount"
              value={form.toAccount}
              onChange={(e) => setForm({ ...form, toAccount: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="amount" className="text-sm font-medium">
              RC Amount (displayed / 1B)
            </Label>
            <div className="space-y-3">
              <Input
                type="number"
                min={0}
                step="0.000000001"
                max={bigMaxDisplay.toString()}
                disabled={delegateMutation.isLoading}
                id="amount"
                value={form.amount}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === '') {
                    setForm({ ...form, amount: '' });
                    return;
                  }
                  if (!/^\d*(\.\d{0,9})?$/.test(raw)) return;
                  try {
                    const b = new Big(raw || '0');
                    if (b.gt(bigMaxDisplay)) {
                      setForm({
                        ...form,
                        amount: formatDisplay(bigMaxDisplay)
                      });
                    } else {
                      setForm({ ...form, amount: raw });
                    }
                  } catch {
                    /* ignore invalid Big parse */
                  }
                }}
              />
              <div className="space-y-2">
                <Slider
                  max={Number(bigMaxRaw.toString()) || 0}
                  step={1}
                  value={[Number(toRawUnits(form.amount === '' ? '0' : form.amount)) || 0]}
                  onValueChange={(value) => {
                    const rawVal = new Big(value[0] || 0);
                    const clampedRaw = rawVal.gt(bigMaxRaw) ? bigMaxRaw : rawVal;
                    const display = clampedRaw.div(SCALE);
                    setForm({
                      ...form,
                      amount: formatDisplay(display)
                    });
                  }}
                  className="w-full"
                />
                <div className="flex justify-center text-xs">
                  <span className="font-medium">
                    {formatDisplay(bigAmountDisplay)} / {formatDisplay(bigMaxDisplay)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                onClick={() => {
                  const amt = bigMaxDisplay.times(percent).div(100);
                  setForm({
                    ...form,
                    amount: formatDisplay(amt)
                  });
                }}
                disabled={delegateMutation.isLoading}
                className="transition-all duration-200"
              >
                {percent}%
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={delegateMutation.isLoading}>
            Cancel
          </Button>
          <Button variant="redHover" onClick={onDelegate} disabled={!isFormValid}>
            {delegateMutation.isLoading ? (
              <span className="flex h-5 w-12 items-center justify-center">
                <CircleSpinner loading={delegateMutation.isLoading} size={18} color="#dc2626" />
              </span>
            ) : (
              'Delegate RC'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DelegateRCDialog;
