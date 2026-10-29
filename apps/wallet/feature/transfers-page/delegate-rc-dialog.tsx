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
import { useAccountLookup, type AccountLookupStatus } from './hooks/use-account-lookup';
import { useEffect, useState } from 'react';
import { handleError } from '@ui/lib/handle-error';
import { GoogleDriveSignInCancelledError } from '@smart-signer/lib/signer/google-drive-sign-in-cancelled';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { Slider } from '@ui/components/slider';
import { Autocompleter } from '@/wallet/components/autocompleter';
import { useTranslation } from '@/wallet/i18n/client';
import {
  RC_INPUT_DECIMALS,
  billionsToRawRc,
  formatRcInput,
  formatRcSummary,
  parseRcBillions,
  rawRcToBillions,
  rcForPercent,
  rcPercentOf
} from './lib/rc-amount';

const defaultForm = { toAccount: '', amount: '0' };
const PERCENT_PRESETS = [25, 50, 75, 100];
/** Arrow keys move the slider by 1 %, PageUp/PageDown by 10 % (Radix multiplies the step by 10). */
const SLIDER_STEP_PERCENT = 1;
/** From this share of the available RC up, the form warns that little is left for the account. */
const ALMOST_ALL_RC_PERCENT = 90;
const AMOUNT_INPUT_PATTERN = new RegExp(`^\\d*(\\.\\d{0,${RC_INPUT_DECIMALS}})?$`);
const ACCOUNT_STATUS_ID = 'delegate-rc-account-status';

const ACCOUNT_STATUS_KEYS: Partial<Record<AccountLookupStatus, string>> = {
  checking: 'transfers_page.delegate_rc.checking_account',
  not_found: 'transfers_page.error.not_found',
  error: 'transfers_page.delegate_rc.account_check_failed'
};

const DelegateRCDialog = ({
  maxRC,
  suggestedUsers
}: {
  maxRC: string;
  suggestedUsers: { username: string; about: string }[];
}) => {
  const { t } = useTranslation('common_wallet');
  const delegateMutation = useDelegateRCMutation();
  const [form, setForm] = useState(defaultForm);
  const [open, setOpen] = useState(false);
  const toAccount = form.toAccount.trim();
  const accountStatus = useAccountLookup(toAccount);
  const maxBillions = rawRcToBillions(maxRC);
  const amountBillions = parseRcBillions(form.amount);
  const percent = rcPercentOf(amountBillions, maxBillions);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setForm(defaultForm);
  };

  const setToAccount = (toAccount: string) => setForm((prev) => ({ ...prev, toAccount }));
  const setAmount = (billions: string) => setForm((prev) => ({ ...prev, amount: billions }));
  const setPercent = (next: number) => setAmount(formatRcInput(rcForPercent(maxBillions, next)));

  const onAmountInput = (input: string) => {
    const typed = input.trim();
    if (!AMOUNT_INPUT_PATTERN.test(typed)) return;
    setAmount(parseRcBillions(typed).gt(maxBillions) ? formatRcInput(maxBillions) : typed);
  };

  const onDelegate = async () => {
    const rawToSend = billionsToRawRc(amountBillions);
    try {
      await delegateMutation.mutateAsync({ toAccount, amount: rawToSend });
    } catch (error) {
      handleError(error, { method: 'delegate', params: { toAccount, amount: rawToSend } });
      // Delegating again would only bring the Google Drive dialog back
      if (error instanceof GoogleDriveSignInCancelledError) handleOpenChange(false);
    }
  };

  useEffect(() => {
    if (delegateMutation.isSuccess) {
      setOpen(false);
      setForm(defaultForm);
    }
  }, [delegateMutation.isSuccess]);

  const isAmountValid = amountBillions.gt(0) && amountBillions.lte(maxBillions);
  const isFormValid = isAmountValid && accountStatus === 'found' && !delegateMutation.isPending;
  const accountStatusKey = ACCOUNT_STATUS_KEYS[accountStatus];
  const summary = { amount: formatRcSummary(amountBillions), max: formatRcSummary(maxBillions) };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outlineRed">{t('transfers_page.delegate_rc.title')}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('global.close')}>
        <DialogHeader>
          <DialogTitle>{t('transfers_page.delegate_rc.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            {/* The combobox is named by the autocompleter's own label; this is its visible twin. */}
            <p aria-hidden className="text-sm font-medium leading-none">
              {t('transfers_page.delegate_rc.to_account')}
            </p>
            <Autocompleter
              items={suggestedUsers}
              value={form.toAccount}
              label={t('transfers_page.delegate_rc.to_account')}
              inputProps={{
                disabled: delegateMutation.isPending,
                'aria-invalid': accountStatus === 'not_found' || accountStatus === 'error',
                'aria-describedby': accountStatusKey ? ACCOUNT_STATUS_ID : undefined
              }}
              onChange={setToAccount}
            />
            {accountStatusKey ? (
              <p
                id={ACCOUNT_STATUS_ID}
                aria-live="polite"
                className={accountStatus === 'checking' ? 'text-xs text-primary/70' : 'text-xs text-destructive'}
              >
                {t(accountStatusKey)}
              </p>
            ) : null}
          </div>
          <div className="space-y-4">
            <Label htmlFor="amount" className="text-sm font-medium">
              {t('transfers_page.delegate_rc.amount_label')}
            </Label>
            <div className="space-y-3">
              <Input
                type="number"
                min={0}
                step={`0.${'0'.repeat(RC_INPUT_DECIMALS - 1)}1`}
                max={maxBillions.toString()}
                disabled={delegateMutation.isPending}
                id="amount"
                value={form.amount}
                onChange={(e) => onAmountInput(e.target.value)}
              />
              <div className="space-y-2">
                <Slider
                  thumbAriaLabel={t('transfers_page.delegate_rc.slider_label')}
                  thumbAriaValueText={t('transfers_page.delegate_rc.value_text', {
                    ...summary,
                    percent: Math.round(percent)
                  })}
                  min={0}
                  max={100}
                  step={SLIDER_STEP_PERCENT}
                  disabled={delegateMutation.isPending || maxBillions.lte(0)}
                  value={[percent]}
                  onValueChange={([next]) => setPercent(next ?? 0)}
                  className="w-full"
                />
                <div className="flex justify-center text-xs">
                  <span className="font-medium">{t('transfers_page.delegate_rc.readout', summary)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PERCENT_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setPercent(preset)}
                disabled={delegateMutation.isPending}
                className="transition-all duration-200"
              >
                {preset}%
              </Button>
            ))}
          </div>
          {isAmountValid && percent >= ALMOST_ALL_RC_PERCENT ? (
            <p role="alert" className="text-sm text-destructive">
              {t('transfers_page.delegate_rc.almost_all_warning', { percent: Math.round(percent) })}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={delegateMutation.isPending}
          >
            {t('transfers_page.cancel')}
          </Button>
          <Button variant="redHover" onClick={onDelegate} disabled={!isFormValid}>
            {delegateMutation.isPending ? (
              <span className="flex h-5 w-12 items-center justify-center">
                <CircleSpinner loading={delegateMutation.isPending} size={18} color="#dc2626" />
              </span>
            ) : (
              t('transfers_page.delegate_rc.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DelegateRCDialog;
