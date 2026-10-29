'use client';

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@ui/components';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';
import { Icons } from '@ui/components/icons';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Autocompleter } from './autocompleter';
import EncryptMemoDialog from './encrypt-memo-dialog';
import badActorList from '@ui/config/lists/bad-actor-list';
import {
  useTransferHiveMutation,
  useTransferToSavingsMutation,
  useWithdrawFromSavingsMutation
} from './hooks/use-transfer-hive-mutation';
import { usePowerDownMutation, usePowerUpMutation } from './hooks/use-power-hive-mutation';
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { useMinDelegation } from './hooks/use-min-delegation';
import { handleError } from '@ui/lib/handle-error';
import { GoogleDriveSignInCancelledError } from '@smart-signer/lib/signer/google-drive-sign-in-cancelled';
import { useQueryClient } from '@tanstack/react-query';
import type { TransactionBroadcastResult } from '@transaction/index';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@/wallet/i18n/client';
import { getAccount } from '@transaction/lib/hive-api';
import { type AccountNameFormatError, checkAccountNameFormat } from '@ui/lib/account-name-rules';
import { Slider } from '@ui/components/slider';
import Big from 'big.js';
import { convertStringToBig } from '@ui/lib/helpers';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { toast } from '@ui/components/hooks/use-toast';
import { getAsset } from '@transaction/lib/utils';
import { detectSecretInMemo } from '@ui/lib/memo-secret-check';
import { MemoSecretWarning } from './memo-secret-warning';
import { type EncryptedMemo, hasEncryptedMemoMarker, memoToBroadcast } from '@/wallet/lib/encrypted-memo';
import { rejectedMinDelegationVests } from '@/wallet/lib/min-delegation';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { createNaiAsset } from '@ui/lib/asset-constants';
import { convertToHP } from '@ui/lib/utils';

// After applying this operation, vesting_shares will be withdrawn at a rate of vesting_shares/13 per week for 13 weeks starting one week after this operation is included in the blockchain.
const HIVE_VESTING_WITHDRAW_INTERVALS = 13;

const ACCOUNT_FORMAT_ERROR_KEYS: Record<AccountNameFormatError, string> = {
  empty: 'transfers_page.error.required',
  too_short: 'transfers_page.error.account_length_min',
  too_long: 'transfers_page.error.account_length_max',
  segment_charset: 'transfers_page.error.not_found',
  segment_start: 'transfers_page.error.not_found',
  segment_end: 'transfers_page.error.not_found',
  segment_too_short: 'transfers_page.error.not_found'
};

// wax is imported only once a broadcast has failed, so it stays out of the page's initial chunks.
const isPrivateKeyLeak = async (error: unknown) =>
  error instanceof (await import('@hiveio/wax')).WaxPrivateKeyLeakDetectedException;

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

export type TransferDialogType =
  | 'transfers'
  | 'transferTo'
  | 'powerUp'
  | 'delegate'
  | 'withdrawHive'
  | 'withdrawHiveDollars'
  | 'powerDown';

export function TransferDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  type,
  amount,
  currency,
  username,
  suggestedUsers
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  type: TransferDialogType;
  amount: Amount;
  currency: 'HIVE' | 'HBD';
  username: string;
  suggestedUsers: { username: string; about: string }[];
}) {
  const { t } = useTranslation('common_wallet');
  const fieldIdPrefix = useId();
  const fieldIds = {
    from: `${fieldIdPrefix}-from`,
    toError: `${fieldIdPrefix}-to-error`,
    amount: `${fieldIdPrefix}-amount`,
    amountError: `${fieldIdPrefix}-amount-error`,
    memo: `${fieldIdPrefix}-memo`
  };
  const defaultValue = {
    title: '',
    description: '',
    amount: '',
    advancedBtn: false,
    selectCurr: true,
    buttonTitle: t('transfers_page.next'),
    to: ['transferTo', 'powerUp', 'withdrawHive', 'withdrawHiveDollars'].includes(type) ? username : '',
    onSubmit: () => {},
    memo: '',
    requestId: 0
  };
  const [curr, setCurr] = useState<'HIVE' | 'HBD'>(currency);
  const [value, setValue] = useState('0');
  const [advanced, setAdvanced] = useState(false);
  const [data, setData] = useState(defaultValue);
  const badActors = badActorList.includes(data.to);
  const memoSecret = detectSecretInMemo(data.memo);
  // The override covers only the memo it was given for: any edit has to be acknowledged again.
  const [acknowledgedMemo, setAcknowledgedMemo] = useState<string | null>(null);
  const memoSecretAcknowledged = acknowledgedMemo === data.memo;
  const memoBlocked = memoSecret !== null && !memoSecretAcknowledged;
  const onMemoSecretAcknowledgedChange = useCallback(
    (acknowledged: boolean) => setAcknowledgedMemo(acknowledged ? data.memo : null),
    [data.memo]
  );
  const transferMutation = useTransferHiveMutation();
  const transferToSavingsMutation = useTransferToSavingsMutation();
  const powerUpMutation = usePowerUpMutation();
  const powerDownMutation = usePowerDownMutation();
  const delegateMutation = useDelegateMutation();
  const withdrawFromSavingsMutation = useWithdrawFromSavingsMutation();
  const confirmTitleRef = useRef<HTMLHeadingElement>(null);
  const [nextOpen, setNextOpen] = useState(false);
  const minDelegation = useMinDelegation(type === 'delegate' && open);
  const [encryptDialogOpen, setEncryptDialogOpen] = useState(false);
  // `data.memo` stays the plaintext, which the secret guard above checks; the ciphertext is kept apart.
  const [encryptedMemo, setEncryptedMemo] = useState<EncryptedMemo | null>(null);
  const queryClient = useQueryClient();

  const invalidateData = useCallback(() => {
    // invalidate queries after transaction success
    queryClient.invalidateQueries({ queryKey: ['accountData'] });
  }, [queryClient]);

  const transfersTransaction = useCallback(
    async <T,>(
      method: string,
      params: T,
      transaction: (params: T) => Promise<T & { broadcastResult: TransactionBroadcastResult }>,
      explainRejection?: (error: unknown) => string | null
    ) => {
      try {
        await transaction(params);
        invalidateData();
      } catch (error) {
        if (await isPrivateKeyLeak(error)) {
          toast({ title: t('transfers_page.memo_secret_wif'), variant: 'destructive' });
          return;
        }
        const explanation = explainRejection?.(error);
        if (explanation) {
          toast({ title: explanation, variant: 'destructive' });
          return;
        }
        handleError(error, { method, params });
        // OK would only bring the Google Drive dialog back: this sign-in method cannot sign the operation
        if (error instanceof GoogleDriveSignInCancelledError) {
          setNextOpen(false);
          setEncryptDialogOpen(false);
          onOpenChange(false);
        }
      }
    },
    [invalidateData, onOpenChange, t]
  );

  // The transfers page holds the global properties, so the chain's minimum (in VESTS) can be told in HP.
  const explainDelegationRejection = useCallback(
    (error: unknown) => {
      const minVests = rejectedMinDelegationVests(error);
      const globals = queryClient.getQueryData<GetDynamicGlobalPropertiesResponse>([
        'dynamicGlobalPropertiesData'
      ]);
      if (minVests === null || !globals) return null;
      const minHp = convertToHP(
        createNaiAsset('VESTS', minVests),
        globals.total_vesting_shares,
        globals.total_vesting_fund_hive
      );
      return t('transfers_page.error.delegation_below_minimum', {
        min: minHp.toFixed(3),
        amount: convertStringToBig(value).toFixed(3)
      });
    },
    [queryClient, t, value]
  );

  switch (type) {
    case 'transfers':
      data.title = t('transfers_page.transfer_to_account');
      data.description = t('transfers_page.transfer_to_account_desc');
      data.amount = curr === 'HIVE' ? amount.hive : amount.hbd;
      data.onSubmit = async () => {
        const memo = memoToBroadcast(data.memo, data.to, encryptedMemo);
        if (memo === null) {
          setNextOpen(false);
          setEncryptDialogOpen(true);
          return;
        }
        const params = {
          fromAccount: username,
          toAccount: data.to,
          memo,
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
        transfersTransaction('delegate', params, delegateMutation.mutateAsync, explainDelegationRejection);
      };
      break;

    case 'withdrawHive':
      data.title = t('transfers_page.savings_withdraw');
      data.description = t('transfers_page.savings_withdraw_desc');
      data.amount = amount.savingsHive;
      data.advancedBtn = true;
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr),
          requestId: Math.floor((Date.now() / 1000) % 4294967295)
        };
        transfersTransaction('withdrawHive', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;

    case 'withdrawHiveDollars':
      data.title = t('transfers_page.savings_withdraw');
      data.description = t('transfers_page.savings_withdraw_desc');
      data.amount = amount.savingsHbd;
      data.advancedBtn = true;
      data.onSubmit = async () => {
        const params = {
          fromAccount: username,
          toAccount: advanced ? data.to : username,
          memo: data.memo,
          amount: await getAsset(value, curr),
          requestId: Math.floor((Date.now() / 1000) % 4294967295)
        };
        transfersTransaction('withdrawHiveDollars', params, withdrawFromSavingsMutation.mutateAsync);
      };
      break;
  }

  const transferSchema = useMemo(
    () =>
      z.object({
        // A malformed name never reaches the node: find_accounts throws on one longer than 16 characters.
        to: z.string({ message: t('transfers_page.error.required') }).superRefine(async (to, ctx) => {
          const formatError = checkAccountNameFormat(to);
          if (formatError) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(ACCOUNT_FORMAT_ERROR_KEYS[formatError]) });
            return;
          }
          // Skip validation on server-side to avoid SSR issues
          if (typeof window === 'undefined') return;
          try {
            if (!(await getAccount(to))) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('transfers_page.error.not_found') });
            }
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('transfers_page.error.account_check_failed')
            });
          }
        }),
        amount: z
          .number({ message: t('transfers_page.error.amount_empty') })
          .positive({ message: t('transfers_page.error.amount_not_positive') })
          .refine((amount) => amount <= Number(data.amount.replaceAll(',', '').match(/[-+]?\d*\.?\d+/)), {
            message: t('transfers_page.error.insufficient_funds')
          })
          .refine((amount) => !minDelegation || minDelegation.lte(amount), {
            message: t('transfers_page.error.min_delegation', { min: minDelegation?.toFixed(3) })
          })
          .refine((amount) => /^\d+(\.\d{1,3})?$/.test(amount.toString()), {
            message: t('transfers_page.error.precision')
          })
      }),
    [data.amount, minDelegation, t]
  );
  type TransferFormValues = z.infer<typeof transferSchema>;

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    mode: 'onSubmit',
    defaultValues: {
      to: data.to
    }
  });
  const toError = form.formState.errors.to?.message;
  const amountError = form.formState.errors.amount?.message;

  const onSubmit: SubmitHandler<TransferFormValues> = () => {
    if (memoBlocked) return;
    if (type === 'transfers' && memoToBroadcast(data.memo, data.to, encryptedMemo) === null) {
      setEncryptDialogOpen(true);
      return;
    }
    setNextOpen(true);
  };

  const onConfirm = () => {
    if (memoBlocked) return;
    data.onSubmit();
  };

  const isBroadcasting =
    transferMutation.isPending ||
    transferToSavingsMutation.isPending ||
    powerUpMutation.isPending ||
    delegateMutation.isPending ||
    withdrawFromSavingsMutation.isPending;

  // OK is disabled while broadcasting, so the focus it held is lost: give it to the heading when a broadcast fails.
  useEffect(() => {
    if (!isBroadcasting && nextOpen) confirmTitleRef.current?.focus();
  }, [isBroadcasting]);

  const focusConfirmTitle = useCallback((event: Event) => {
    event.preventDefault();
    confirmTitleRef.current?.focus();
  }, []);

  const belowMinDelegation = minDelegation !== undefined && minDelegation.gt(amount.reducedHP);
  useEffect(() => {
    if (
      transferMutation.isSuccess ||
      transferToSavingsMutation.isSuccess ||
      powerUpMutation.isSuccess ||
      delegateMutation.isSuccess ||
      withdrawFromSavingsMutation.isSuccess
    ) {
      onOpenChange(false);
      setNextOpen(false);
      setEncryptDialogOpen(false);
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
      onOpenChange(false);
    }
  }, [powerDownMutation.isSuccess]);

  const delegated = amount.delegatedVesting.gt(0);
  const withdrawinformation = amount.to_withdraw.minus(amount.withdraw).gt(0);
  return (
    <>
      <EncryptMemoDialog
        open={encryptDialogOpen}
        onOpenChange={setEncryptDialogOpen}
        fromAccount={username}
        toAccount={data.to}
        memo={data.memo}
        onEncrypted={(ciphertext) => {
          setEncryptedMemo({ plaintext: data.memo, toAccount: data.to, ciphertext });
          setEncryptDialogOpen(false);
          setNextOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="text-left sm:max-w-[425px]"
          onCloseAutoFocus={onCloseAutoFocus}
          closeLabel={t('global.close')}
        >
          <form>
            <DialogHeader>
              <DialogTitle className="text-left text-2xl">{data.title}</DialogTitle>
              <DialogDescription className="text-left">{data.description} </DialogDescription>
            </DialogHeader>
            {belowMinDelegation ? (
              <p role="alert" className="pt-4 text-sm text-destructive">
                {t('transfers_page.error.cannot_delegate', {
                  min: minDelegation.toFixed(3),
                  available: amount.reducedHP
                })}
              </p>
            ) : null}
            {type !== 'powerDown' ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={fieldIds.from} className="font-normal">
                    {t('transfers_page.from')}
                  </Label>
                  <div className="relative col-span-3">
                    <Input
                      id={fieldIds.from}
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
                          label={t('transfers_page.to')}
                          items={suggestedUsers}
                          value={data.to}
                          inputProps={{
                            'aria-invalid': !!toError,
                            'aria-describedby': toError ? fieldIds.toError : undefined
                          }}
                          onChange={(e) => {
                            setData({ ...data, to: e });
                            form.setValue('to', e);
                          }}
                        />
                        {toError ? (
                          <p id={fieldIds.toError} className="pt-1 text-sm text-destructive">
                            {toError}
                          </p>
                        ) : null}
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
                  <Label htmlFor={fieldIds.amount} className="font-normal">
                    {t('transfers_page.amount')}
                  </Label>
                  <div className="relative col-span-3">
                    <Input
                      {...form.register('amount', {
                        valueAsNumber: true,
                        onChange: (e) => setValue(e.target.value)
                      })}
                      id={fieldIds.amount}
                      aria-invalid={!!amountError}
                      aria-describedby={amountError ? fieldIds.amountError : undefined}
                      placeholder={t('transfers_page.amount')}
                      className="text-stale-900 block w-full px-3 py-2.5"
                      type="number"
                      step="any"
                    />
                    {/* After the amount in the DOM, so Tab reaches it in its visual order. */}
                    {data.selectCurr && (
                      <div className="absolute right-0 top-0">
                        <Select value={curr} onValueChange={(e: 'HIVE' | 'HBD') => setCurr(e)}>
                          <SelectTrigger
                            aria-label={t('transfers_page.currency')}
                            disabled={type === 'delegate'}
                            className="my-[1.5px] mr-px h-9 w-fit border-none focus:ring-0 focus:ring-offset-0"
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
                  </div>
                </div>
                {amountError ? (
                  <div className="grid grid-cols-4 gap-4">
                    <p id={fieldIds.amountError} className="col-span-3 col-start-2 text-sm text-destructive">
                      {amountError}
                    </p>
                  </div>
                ) : null}
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
                      <div className="col-span-3 text-xs">
                        {hasEncryptedMemoMarker(data.memo)
                          ? t('transfers_page.memo_will_be_encrypted')
                          : t('transfers_page.memo_public')}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={fieldIds.memo} className="font-normal">
                        {t('transfers_page.memo')}
                      </Label>
                      <Input
                        id={fieldIds.memo}
                        placeholder={t('transfers_page.memo')}
                        className="col-span-3"
                        value={data.memo}
                        onChange={(e) => setData({ ...data, memo: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {memoSecret ? (
                  <MemoSecretWarning
                    kind={memoSecret}
                    acknowledged={memoSecretAcknowledged}
                    onAcknowledgedChange={onMemoSecretAcknowledgedChange}
                  />
                ) : null}
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
                    placeholder={t('transfers_page.amount')}
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
              <Button
                variant="redHover"
                className="w-fit"
                disabled={badActors || memoBlocked || belowMinDelegation || powerDownMutation.isPending}
                onClick={type === 'powerDown' ? onConfirm : form.handleSubmit(onSubmit)}
              >
                {powerDownMutation.isPending ? (
                  <CircleSpinner loading={powerDownMutation.isPending} size={18} color="#dc2626" />
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
          <DialogContent onOpenAutoFocus={focusConfirmTitle} closeLabel={t('global.close')}>
            <DialogTitle ref={confirmTitleRef} tabIndex={-1} className="focus:outline-hidden">
              {t('transfers_page.confirm_transaction', { transaction: data.title })}
            </DialogTitle>
            {type !== 'delegate' ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  {t('transfers_page.from')}
                  <div className="relative col-span-3">
                    <Input
                      defaultValue={username}
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5 pl-11"
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
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5 pl-11"
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
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5"
                    />
                  </div>
                </div>
                {data.memo === '' ? null : (
                  <div className="grid grid-cols-4 items-center gap-4">
                    {t('transfers_page.memo')}
                    <div className="relative col-span-3">
                      <Input
                        defaultValue={data.memo}
                        className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5"
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
                        className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5"
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
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5 pl-11"
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
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5 pl-11"
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
                      className="text-stale-900 pointer-events-none block w-full cursor-default! px-3 py-2.5"
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
                disabled={isBroadcasting}
              >
                {isBroadcasting ? (
                  <CircleSpinner loading={isBroadcasting} size={18} color="#dc2626" />
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
    </>
  );
}
