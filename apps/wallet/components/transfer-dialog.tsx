import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@ui/components';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@ui/components/dialog';
import { Icons } from '@ui/components/icons';
import { Input } from '@ui/components/input';
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Autocompleter } from './autocompleter';
import badActorList from '@ui/config/lists/bad-actor-list';
import {
  useTransferHiveMutation,
  useTransferToSavingsMutation,
  useWithdrawFromSavingsMutation
} from './hooks/use-transfer-hive-mutation';
import { usePowerDownMutation, usePowerUpMutation } from './hooks/use-power-hive-mutation';
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { handleError } from '@ui/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult } from '@transaction/index';
import { getVests, getAsset } from '../lib/utils';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'next-i18next';

type Amount = {
  hive: string;
  hbd: string;
  hp: string;
  savingsHive: string;
  savingsHbd: string;
};

export function TransferDialog({
  children,
  type,
  amount,
  currency,
  username
}: {
  children: ReactNode;
  type:
    | 'transfers'
    | 'transferTo'
    | 'powerUp'
    | 'delegate'
    | 'withdrawHive'
    | 'withdrawHiveDollars'
    | 'powerDown';
  amount: Amount;
  currency: 'hive' | 'hbd';
  username: string;
}) {
  const defaultValue = {
    title: '',
    description: '',
    amount: '',
    advancedBtn: false,
    selectCurr: true,
    buttonTitle: 'Next',
    to: '',
    onSubmit: new Function(),
    memo: ''
  };
  const { t } = useTranslation('common_wallet');
  const [curr, setCurr] = useState<'hive' | 'hbd'>(currency);
  const [value, setValue] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [data, setData] = useState(defaultValue);
  const badActors = badActorList.includes(data.to);
  const transferMutation = useTransferHiveMutation();
  const transferToSavingsMutation = useTransferToSavingsMutation();
  const powerUpMutation = usePowerUpMutation();
  const powerDownMutation = usePowerDownMutation();
  const delegateMutation = useDelegateMutation();
  const withdrawFromSavingsMutation = useWithdrawFromSavingsMutation();
  const triggerRef = useRef(null);

  const queryClient = useQueryClient();

  const invalidateData = useCallback(() => {
    // invalidate queries after transaction success
    queryClient.invalidateQueries({ queryKey: ['accountData'] });
  }, [queryClient]);

  const transfersTransaction = useCallback(
    async <T,>(
      method: string,
      params: T,
      transaction: (params: T) => Promise<T & { broadcastResult: TransactionBroadcastResult }>
    ) => {
      try {
        await transaction(params);
        invalidateData();
      } catch (error) {
        handleError(error, { method, params });
      }
    },
    [invalidateData]
  );

  switch (type) {
    case 'transfers':
      data.title = 'Transfer to Account';
      data.description = 'Move funds to another Hive account.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: data.to,
          memo: data.memo,
          amount: await getAsset(value, curr)
        };
        transfersTransaction('transfer', params, transferMutation.mutateAsync);
      };
      break;

    case 'transferTo':
      data.title = 'Transfer to Savings';
      data.description = 'Protect funds by requiring a 3 day withdraw waiting period.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.to = username || '';
      data.onSubmit = async () => {
        const params = {
          amount: await getAsset(value, curr),
          fromAccount: data.to,
          toAccount: data.to,
          memo: data.memo
        };
        transfersTransaction('transferToSavings', params, transferToSavingsMutation.mutateAsync);
      };
      break;

    case 'powerUp':
      data.title = 'Convert to HIVE POWER';
      data.description =
        'Influence tokens which give you more control over post payouts and allow you to earn on curation rewards. HIVE POWER is non-transferable and requires 3 months (13 payments) to convert back to HIVE.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.to = username || '';
      data.selectCurr = false;
      data.buttonTitle = 'Power Up';
      data.onSubmit = async () => {
        const params = { account: username, amount: await getAsset(value, curr) };
        transfersTransaction('powerUp', params, powerUpMutation.mutateAsync);
      };
      break;

    case 'powerDown':
      data.title = 'Power Down';
      data.description = '';
      data.buttonTitle = 'Power Down';
      data.amount = amount.hp;
      data.onSubmit = async () => {
        const params = { account: username, vestingShares: await getVests(value) };
        transfersTransaction('powerDown', params, powerDownMutation.mutateAsync);
      };
      break;

    case 'delegate':
      data.title = 'Delegate to Account';
      data.description = '';
      data.amount = amount.hp;
      data.onSubmit = async () => {
        const params = { delegator: username, delegatee: data.to, vestingShares: await getVests(value) };
        transfersTransaction('delegate', params, delegateMutation.mutateAsync);
      };
      break;

    case 'withdrawHive':
      data.title = 'Savings Withdraw';
      data.description = 'Withdraw funds after the required 3 day waiting period.';
      data.amount = amount.savingsHive;
      data.to = username || '';
      data.advancedBtn = true;
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr)
        };
        transfersTransaction('withdrawHive', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;

    case 'withdrawHiveDollars':
      data.title = 'Savings Withdraw';
      data.description = 'Withdraw funds after the required 3 day waiting period.';
      data.amount = amount.savingsHbd;
      data.to = username || '';
      data.advancedBtn = true;
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr)
        };
        transfersTransaction('withdrawHiveDollars', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;
  }

  const transferSchema = useMemo(
    () =>
      z.object({
        to: z
          .string({ message: 'required' })
          .min(3, { message: 'account_length_min' })
          .max(16, { message: 'account_length_max' }),
        amount: z
          .number({ message: 'amount_empty' })
          .positive({ message: 'amount_not_positive' })
          .refine((amount) => amount <= Number(data.amount.split(' ')[0].replaceAll(',', '')), {
            message: 'insufficient_funds'
          })
      }),
    [data.amount]
  );

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    mode: 'onSubmit'
  });

  const onSubmit: SubmitHandler<z.infer<typeof transferSchema>> = () => {
    data.onSubmit();
    // @ts-expect-error
    triggerRef.current.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-background-tertiary hover:text-primary">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="text-left sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-left">{data.title}</DialogTitle>
            <DialogDescription className="text-left">{data.description} </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 ">
            <div className="grid grid-cols-4 items-center gap-4">
              From
              <div className="relative col-span-3">
                <Input
                  disabled
                  defaultValue={username}
                  className="text-stale-900 block w-full px-3 py-2.5 pl-11"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icons.atSign className="h-5 w-5" />
                </div>
              </div>
            </div>
            {(advanced || !data.advancedBtn) && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  To
                  <div className="col-span-3">
                    <Autocompleter
                      value={data.to}
                      onChange={(e) => {
                        setData({ ...data, to: e });
                        form.setValue('to', e);
                      }}
                    />
                  </div>
                </div>
                {badActors ? (
                  <div className="p-2 text-sm text-red-500">
                    Use caution sending to this account. Please double check your spelling for possible
                    phishing.
                  </div>
                ) : null}
              </>
            )}
            {type === 'powerUp' && advanced ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className=" col-span-1"></div>
                <div className="col-span-3 w-fit pl-0 text-xs">
                  Converted HIVE POWER can be sent to yourself or someone else but can not transfer again
                  without converting back to HIVE.
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-4 items-center gap-4">
              Amount
              <div className="relative col-span-3">
                {data.selectCurr && (
                  <div className="absolute right-0">
                    <Select
                      name="amout right-0"
                      value={curr}
                      onValueChange={(e: 'hive' | 'hbd') => setCurr(e)}
                    >
                      <SelectTrigger className="w-fit" onSelect={() => setCurr('hive')}>
                        <SelectValue placeholder={curr} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="hive">HIVE</SelectItem>
                          <SelectItem value="hbd">HBD</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Input
                  {...form.register('amount', {
                    valueAsNumber: true,
                    onChange: (e) => setValue(e.target.value)
                  })}
                  placeholder="Amount"
                  className="text-stale-900 block w-full px-3 py-2.5"
                  type="number"
                />
              </div>
            </div>
            <div>
              {form.formState.errors.amount && (
                <div className="text-sm text-destructive">
                  {t(`transfers_page.error.${form.formState.errors.amount.message}`)}
                </div>
              )}
              {form.formState.errors.to && (
                <div className="text-sm text-destructive">
                  {t(`transfers_page.error.${form.formState.errors.to.message}`)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className=" col-span-1"></div>
              <Button
                variant="link"
                className="col-span-3 w-fit pl-0"
                onClick={() => setValue(data.amount.replace(/[^0-9.]/g, ''))}
              >
                Balance: {data.amount}
              </Button>
            </div>
            {type === 'transfers' && (
              <div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1"></div>
                  <div className="col-span-3 text-xs">This memo is public</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  Memo
                  <Input
                    placeholder="Memo"
                    className="col-span-3"
                    value={data.memo}
                    onChange={(e) => setData({ ...data, memo: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
            <DialogTrigger ref={triggerRef}></DialogTrigger>
            <Button type="submit" variant="redHover" className="w-fit" disabled={badActors}>
              {data.buttonTitle}
            </Button>
            {data.advancedBtn && (
              <Button className="w-fit" variant="ghost" onClick={() => setAdvanced(!advanced)}>
                {advanced ? <span>Basic</span> : <span>Advanced</span>}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
