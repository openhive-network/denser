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
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Autocompleter } from './autocompleter';
import badActorList from '@ui/config/lists/bad-actor-list';
import {
  useTransferHiveMutation,
  useTransferToSavingsMutation,
  useWithdrawFromSavingsMutation
} from './hooks/use-transfer-hive-mutation';
import { usePowerDownMutation, usePowerUpMutation } from './hooks/use-power-hive-mutation';
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { handleError } from '@ui/lib/handle-error';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult } from '@transaction/index';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'next-i18next';
import { getAccount } from '@transaction/lib/hive-api';
import { Slider } from '@ui/components/slider';
import Big from 'big.js';
import { convertStringToBig } from '@ui/lib/helpers';
import { CircleSpinner } from 'react-spinners-kit';
import { toast } from '@ui/components/hooks/use-toast';
import { getAsset } from '@transaction/lib/utils';

// After applying this operation, vesting_shares will be withdrawn at a rate of vesting_shares/13 per week for 13 weeks starting one week after this operation is included in the blockchain.
const HIVE_VESTING_WITHDRAW_INTERVALS = 13;

type Amount = {
  hive: string;
  hbd: string;
  reducedHP: string;
  savingsHive: string;
  savingsHbd: string;
  delegatedVesting: Big;
  to_withdraw: Big;
  withdraw: Big;
};

export function TransferDialog({
  children,
  type,
  amount,
  currency,
  username,
  suggestedUsers
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
  currency: 'HIVE' | 'HBD';
  username: string;
  suggestedUsers: { username: string; about: string }[];
}) {
  const { t } = useTranslation('common_wallet');
  const defaultValue = {
    title: '',
    description: '',
    amount: '',
    advancedBtn: false,
    selectCurr: true,
    buttonTitle: t('transfers_page.next'),
    to: ['transferTo', 'powerUp', 'withdrawHive', 'withdrawHiveDollars'].includes(type) ? username : '',
    onSubmit: new Function(),
    memo: '',
    requestId: 0
  };
  const [curr, setCurr] = useState<'HIVE' | 'HBD'>(currency);
  const [value, setValue] = useState('0');
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
  const [nextOpen, setNextOpen] = useState(false);
  const [open, setOpen] = useState(false);
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
      data.title = t('transfers_page.transfer_to_account');
      data.description = t('transfers_page.transfer_to_account_desc');
      data.amount = curr === 'HIVE' ? amount.hive : amount.hbd;
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
      data.title = t('transfers_page.transfer_to');
      data.description = t('transfers_page.transfer_to_desc');
      data.amount = curr === 'HIVE' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.onSubmit = async () => {
        const params = {
          amount: await getAsset(value, curr),
          fromAccount: username,
          toAccount: data.to,
          memo: data.memo
        };
        transfersTransaction('transferToSavings', params, transferToSavingsMutation.mutateAsync);
      };
      break;

    case 'powerUp':
      data.title = t('transfers_page.power_up');
      data.description = t('transfers_page.power_up_desc');
      data.amount = curr === 'HIVE' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.selectCurr = false;
      data.buttonTitle = t('transfers_page.power_up');
      data.onSubmit = async () => {
        const params = { fromAccount: username, toAccount: data.to, amount: await getAsset(value, curr) };
        transfersTransaction('powerUp', params, powerUpMutation.mutateAsync);
      };
      break;

    case 'powerDown':
      data.title = t('transfers_page.power_down');
      data.description = '';
      data.buttonTitle = t('transfers_page.power_down');
      data.amount = amount.reducedHP;
      data.onSubmit = async () => {
        const params = {
          account: username,
          hp: await getAsset(value, 'HIVE')
        };
        transfersTransaction('powerDown', params, powerDownMutation.mutateAsync);
      };
      break;

    case 'delegate':
      data.title = t('transfers_page.delegate');
      data.description = '';
      data.amount = amount.reducedHP;
      data.onSubmit = async () => {
        const params = {
          delegator: username,
          delegatee: data.to,
          hp: await getAsset(value, 'HIVE')
        };
        transfersTransaction('delegate', params, delegateMutation.mutateAsync);
      };
      break;

    case 'withdrawHive':
      data.title = t('transfers_page.savings_withdraw');
      data.description = t('transfers_page.savings_withdraw_desc');
      data.amount = amount.savingsHive;
      data.advancedBtn = true;
      data.requestId = Math.floor((Date.now() / 1000) % 4294967295);
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr),
          requestId: data.requestId
        };
        transfersTransaction('withdrawHive', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;

    case 'withdrawHiveDollars':
      data.title = t('transfers_page.savings_withdraw');
      data.description = t('transfers_page.savings_withdraw_desc');
      data.amount = amount.savingsHbd;
      data.advancedBtn = true;
      data.requestId = Math.floor((Date.now() / 1000) % 4294967295);
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr),
          requestId: data.requestId
        };
        transfersTransaction('withdrawHiveDollars', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;
  }

  const transferSchema = useMemo(
    () =>
      z.object({
        to: z
          .string({ message: t('transfers_page.error.required') })
          .min(3, { message: t('transfers_page.error.account_length_min') })
          .max(16, { message: t('transfers_page.error.account_length_max') })
          .refine(async (to) => !!(await getAccount(to)), { message: t('transfers_page.error.not_found') }),
        amount: z
          .number({ message: t('transfers_page.error.amount_empty') })
          .positive({ message: t('transfers_page.error.amount_not_positive') })
          .refine((amount) => amount <= Number(data.amount.replaceAll(',', '').match(/[-+]?\d*\.?\d+/)), {
            message: t('transfers_page.error.insufficient_funds')
          })
          .refine((amount) => /^\d+(\.\d{1,3})?$/.test(amount.toString()), {
            message: t('transfers_page.error.precision')
          })
      }),
    [data.amount, t]
  );
  type TransferFormValues = z.infer<typeof transferSchema>;

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    mode: 'onSubmit',
    defaultValues: {
      to: data.to
    }
  });
  const onSubmit: SubmitHandler<TransferFormValues> = () => {
    setNextOpen(true);
  };

  const onConfirm = () => {
    data.onSubmit();
  };
  useEffect(() => {
    if (
      transferMutation.isSuccess ||
      transferToSavingsMutation.isSuccess ||
      powerUpMutation.isSuccess ||
      delegateMutation.isSuccess ||
      withdrawFromSavingsMutation.isSuccess
    ) {
      setOpen(false);
      setNextOpen(false);
      toast({
        title: t('transfers_page.transaction_success'),
        description: data.title,
        variant: 'success'
      });
    }
  }, [
    transferMutation.isSuccess,
    transferToSavingsMutation.isSuccess,
    powerUpMutation.isSuccess,
    delegateMutation.isSuccess,
    withdrawFromSavingsMutation.isSuccess
  ]);

  useEffect(() => {
    if (powerDownMutation.isSuccess) {
      toast({
        title: t('transfers_page.transaction_success'),
        description: data.title,
        variant: 'success'
      });
      setOpen(false);
    }
  }, [powerDownMutation.isSuccess]);

  const delegated = amount.delegatedVesting.gt(0);
  const withdrawinformation = amount.to_withdraw.minus(amount.withdraw).gt(0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-background-tertiary hover:text-primary">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="text-left sm:max-w-[425px]">
        <form>
          <DialogHeader>
            <DialogTitle className="text-left text-2xl">{data.title}</DialogTitle>
            <DialogDescription className="text-left">{data.description} </DialogDescription>
          </DialogHeader>
          {type !== 'powerDown' ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.from')}
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
                    {t('transfers_page.to')}
                    <div className="col-span-3 mb-6">
                      <Autocompleter
                        items={suggestedUsers}
                        value={data.to}
                        onChange={(e) => {
                          setData({ ...data, to: e });
                          form.setValue('to', e);
                        }}
                      />
                    </div>
                  </div>
                  {badActors ? (
                    <div className="p-2 text-sm text-red-500">{t('transfers_page.bad_actors_info')}</div>
                  ) : null}
                </>
              )}
              {type === 'powerUp' && advanced ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className=" col-span-1"></div>
                  <div className="col-span-3 w-fit pl-0 text-xs">{t('transfers_page.power_up_info')}</div>
                </div>
              ) : null}
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.amount')}
                <div className="relative col-span-3">
                  {data.selectCurr && (
                    <div className="absolute right-0">
                      <Select value={curr} onValueChange={(e: 'HIVE' | 'HBD') => setCurr(e)}>
                        <SelectTrigger
                          disabled={type === 'delegate'}
                          className="my-[1.5px] mr-[1px] h-9 w-fit border-none focus:ring-0 focus:ring-offset-0"
                          onSelect={() => setCurr('HIVE')}
                        >
                          <SelectValue placeholder={curr} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="HIVE">HIVE</SelectItem>
                            <SelectItem value="HBD">HBD</SelectItem>
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
                    step="any"
                  />
                </div>
              </div>
              <div>
                {form.formState.errors.amount && (
                  <div className="text-sm text-destructive">{form.formState.errors.amount.message}</div>
                )}
                {form.formState.errors.to && (
                  <div className="text-sm text-destructive">{form.formState.errors.to.message}</div>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className=" col-span-1"></div>
                <Button
                  variant="link"
                  className="col-span-3 w-fit pl-0 underline underline-offset-4 hover:text-destructive"
                  onClick={() => {
                    form.setValue('amount', Number(data.amount.replace(/[^0-9.]/g, '')));
                    setValue(data.amount.replace(/[^0-9.]/g, ''));
                  }}
                >
                  {t('transfers_page.balance')}: {data.amount}
                </Button>
              </div>
              {type === 'transfers' && (
                <div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="col-span-1"></div>
                    <div className="col-span-3 text-xs">{t('transfers_page.memo_public')}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    {t('transfers_page.memo')}
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
          ) : (
            <div className="grid gap-4 py-4">
              <Slider
                dataTestId="downvote-slider"
                defaultValue={[0]}
                max={Number(data.amount.replace(/[^0-9.]/g, ''))}
                step={0.001}
                onValueChange={(e) => {
                  setValue(e[0].toString());
                  form.setValue('amount', e[0]);
                }}
              />
              <p> {t('transfers_page.amount')}</p>
              <div className="flex items-center gap-4">
                <Input
                  {...form.register('amount', {
                    valueAsNumber: true,
                    onChange: (e) => setValue(e.target.value)
                  })}
                  placeholder="Amount"
                  className="text-stale-900 z-10 block w-full px-3 py-2.5"
                  type="number"
                  step="any"
                  defaultValue={0}
                  max={Number(data.amount.replace(/[^0-9.]/g, ''))}
                />
                <span>HIVE</span>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <p>
                  {t('transfers_page.per_week', {
                    amount: convertStringToBig(value === '' ? '0' : value)
                      .div(HIVE_VESTING_WITHDRAW_INTERVALS)
                      .toFixed(1)
                  })}
                </p>
                {withdrawinformation ? (
                  <p>
                    {t('transfers_page.already_power_down', {
                      amount: amount.to_withdraw.toFixed(3),
                      withdrawn: amount.withdraw.toFixed(3)
                    })}
                  </p>
                ) : null}
                {delegated ? (
                  <p>{t('transfers_page.delegating', { amount: amount.delegatedVesting.toFixed(3) })}</p>
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
            <DialogTrigger ref={triggerRef} className="absolute"></DialogTrigger>

            <Button
              variant="redHover"
              className="w-fit"
              disabled={badActors || powerDownMutation.isLoading}
              onClick={type === 'powerDown' ? onConfirm : form.handleSubmit(onSubmit)}
            >
              {powerDownMutation.isLoading ? (
                <CircleSpinner loading={powerDownMutation.isLoading} size={18} color="#dc2626" />
              ) : (
                data.buttonTitle
              )}
            </Button>
            {data.advancedBtn && (
              <Button
                className="w-fit"
                variant="ghost"
                onClick={() => {
                  setAdvanced((prev) => !prev);
                  switch (type) {
                    case 'transferTo':
                      setData({ ...data, to: advanced ? username : data.to });
                      break;
                    case 'powerUp':
                      setData({ ...data, to: advanced ? username : data.to });
                      break;
                    case 'withdrawHive':
                      setData({ ...data, to: advanced ? username : data.to });
                      break;
                    case 'withdrawHiveDollars':
                      setData({ ...data, to: advanced ? username : data.to });
                      break;
                  }
                }}
                type="button"
              >
                {advanced ? (
                  <span>{t('transfers_page.basic')}</span>
                ) : (
                  <span>{t('transfers_page.advanced')}</span>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
      <Dialog open={nextOpen} onOpenChange={setNextOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle>{t('transfers_page.confirm_transaction', { transaction: data.title })}</DialogTitle>
          {type !== 'delegate' ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.from')}
                <div className="relative col-span-3">
                  <Input
                    defaultValue={username}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5 pl-11"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.to')}
                <div className="relative col-span-3">
                  <Input
                    defaultValue={data.to}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5 pl-11"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.amount')}
                <div className="relative col-span-3">
                  <Input
                    defaultValue={value}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5"
                  />
                </div>
              </div>
              {data.memo === '' ? null : (
                <div className="grid grid-cols-4 items-center gap-4">
                  {t('transfers_page.memo')}
                  <div className="relative col-span-3">
                    <Input
                      defaultValue={data.memo}
                      className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5"
                    />
                  </div>
                </div>
              )}
              {(type === 'withdrawHive' || type === 'withdrawHiveDollars') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  {t('transfers_page.request_id')}
                  <div className="relative col-span-3">
                    <Input
                      defaultValue={data.requestId}
                      className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.delegator')}
                <div className="relative col-span-3">
                  <Input
                    defaultValue={username}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5 pl-11"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                {t('transfers_page.delegatee')}
                <div className="relative col-span-3">
                  <Input
                    defaultValue={data.to}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5 pl-11"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                HIVE
                <div className="relative col-span-3">
                  <Input
                    defaultValue={value}
                    className="text-stale-900 pointer-events-none block w-full !cursor-default px-3 py-2.5"
                  />
                </div>
              </div>
            </>
          )}
          <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
            <Button
              variant="redHover"
              className="w-fit"
              onClick={onConfirm}
              disabled={
                transferMutation.isLoading ||
                transferToSavingsMutation.isLoading ||
                powerUpMutation.isLoading ||
                delegateMutation.isLoading ||
                withdrawFromSavingsMutation.isLoading
              }
            >
              {transferMutation.isLoading ||
              transferToSavingsMutation.isLoading ||
              powerUpMutation.isLoading ||
              delegateMutation.isLoading ||
              withdrawFromSavingsMutation.isLoading ? (
                <CircleSpinner
                  loading={
                    transferMutation.isLoading ||
                    transferToSavingsMutation.isLoading ||
                    powerUpMutation.isLoading ||
                    delegateMutation.isLoading ||
                    withdrawFromSavingsMutation.isLoading
                  }
                  size={18}
                  color="#dc2626"
                />
              ) : (
                t('transfers_page.ok')
              )}
            </Button>
            <Button variant="ghost" className="w-fit" onClick={() => setNextOpen(false)}>
              {t('transfers_page.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
