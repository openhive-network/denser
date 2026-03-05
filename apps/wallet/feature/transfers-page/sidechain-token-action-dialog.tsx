'use client';

import { useMemo, useState } from 'react';
import Big from 'big.js';
import { getAccount } from '@transaction/lib/hive-api';
import { handleError } from '@ui/lib/handle-error';
import { toast } from '@ui/components/hooks/use-toast';
import { CircleSpinner } from 'react-spinners-kit';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input } from '@ui/components';
import {
  SidechainTokenAction,
  useSidechainTokenActionMutation
} from './hooks/use-sidechain-token-action-mutation';

interface SidechainTokenActionDialogProps {
  action: SidechainTokenAction;
  token: string;
  account: string;
  maxAmount: number;
  precision: number;
  customJsonId: string;
  triggerLabel: string;
}

const actionTitles: Record<SidechainTokenAction, string> = {
  transfer: 'Transfer',
  stake: 'Stake',
  unstake: 'Unstake',
  delegate: 'Delegate'
};

const needsTargetAccount = (action: SidechainTokenAction) =>
  action === 'transfer' || action === 'delegate';

const supportsMemo = (action: SidechainTokenAction) => action === 'transfer';

const getDecimalPlaces = (value: string): number => {
  const dotIndex = value.indexOf('.');
  return dotIndex === -1 ? 0 : value.length - dotIndex - 1;
};

const formatQuantity = (input: string, precision: number): string => {
  const decimalPlaces = Math.min(getDecimalPlaces(input), precision);
  return new Big(input).toFixed(decimalPlaces).replace(/\.?0+$/, '') || '0';
};

const SidechainTokenActionDialog = ({
  action,
  token,
  account,
  maxAmount,
  precision,
  customJsonId,
  triggerLabel
}: SidechainTokenActionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const actionMutation = useSidechainTokenActionMutation();

  const amountLabel = useMemo(() => `${token} amount`, [token]);

  const resetState = () => {
    setAmount('');
    setToAccount('');
    setMemo('');
    setError('');
  };

  const validate = async (): Promise<{ quantity: string; destination?: string } | null> => {
    setError('');
    const trimmedAmount = amount.trim();

    if (!trimmedAmount) {
      setError('Amount is required');
      return null;
    }

    let amountBig: Big;
    try {
      amountBig = new Big(trimmedAmount);
    } catch {
      setError('Amount is invalid');
      return null;
    }

    if (amountBig.lte(0)) {
      setError('Amount must be greater than 0');
      return null;
    }

    if (getDecimalPlaces(trimmedAmount) > precision) {
      setError(`Maximum precision is ${precision} decimals`);
      return null;
    }

    if (amountBig.gt(new Big(maxAmount.toString()))) {
      setError('Amount exceeds available balance');
      return null;
    }

    const quantity = formatQuantity(trimmedAmount, precision);

    if (needsTargetAccount(action)) {
      const destination = toAccount.trim().toLowerCase();
      if (!destination) {
        setError('Destination account is required');
        return null;
      }

      let accountData;
      try {
        accountData = await getAccount(destination);
      } catch {
        setError('Unable to verify destination account');
        return null;
      }

      if (!accountData) {
        setError('Destination account not found');
        return null;
      }

      return { quantity, destination };
    }

    return { quantity };
  };

  const onSubmit = async () => {
    const validated = await validate();
    if (!validated) {
      return;
    }

    try {
      if (action === 'transfer') {
        if (!validated.destination) {
          setError('Destination account is required');
          return;
        }
        await actionMutation.mutateAsync({
          action,
          account,
          symbol: token,
          quantity: validated.quantity,
          toAccount: validated.destination,
          memo,
          customJsonId
        });
      } else if (action === 'stake') {
        await actionMutation.mutateAsync({
          action,
          account,
          symbol: token,
          quantity: validated.quantity,
          customJsonId
        });
      } else if (action === 'unstake') {
        await actionMutation.mutateAsync({
          action,
          account,
          symbol: token,
          quantity: validated.quantity,
          customJsonId
        });
      } else {
        if (!validated.destination) {
          setError('Destination account is required');
          return;
        }
        await actionMutation.mutateAsync({
          action,
          account,
          symbol: token,
          quantity: validated.quantity,
          toAccount: validated.destination,
          customJsonId
        });
      }

      toast({
        title: 'Transaction success',
        description: `${actionTitles[action]} ${token}`,
        variant: 'success'
      });
      setOpen(false);
      resetState();
    } catch (submitError) {
      handleError(submitError, {
        method: `sidechain_${action}`,
        params: {
          account,
          token,
          amount
        }
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <div className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-background-tertiary hover:text-primary">
          {triggerLabel}
        </div>
      </DialogTrigger>
      <DialogContent className="text-left sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{`${actionTitles[action]} ${token}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-primary/70">Available</div>
            <div className="font-semibold">{`${maxAmount.toLocaleString(undefined, {
              maximumFractionDigits: Math.min(Math.max(precision, 0), 8)
            })} ${token}`}</div>
          </div>

          <div>
            <div className="mb-1 text-xs text-primary/70">{amountLabel}</div>
            <Input
              type="number"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`0.${'0'.repeat(Math.min(Math.max(precision, 1), 8))}`}
            />
          </div>

          {needsTargetAccount(action) ? (
            <div>
              <div className="mb-1 text-xs text-primary/70">To account</div>
              <Input
                value={toAccount}
                onChange={(event) => setToAccount(event.target.value)}
                placeholder="@username"
              />
            </div>
          ) : null}

          {supportsMemo(action) ? (
            <div>
              <div className="mb-1 text-xs text-primary/70">Memo</div>
              <Input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Memo (optional)" />
            </div>
          ) : null}

          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </div>

        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          <Button
            variant="redHover"
            className="w-fit he-solid-accent"
            onClick={onSubmit}
            disabled={actionMutation.isLoading}
          >
            {actionMutation.isLoading ? (
              <CircleSpinner loading={actionMutation.isLoading} size={18} color="hsl(var(--destructive))" />
            ) : (
              `${actionTitles[action]} ${token}`
            )}
          </Button>
          <Button variant="ghost" className="w-fit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SidechainTokenActionDialog;
