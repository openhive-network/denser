'use client';

import { getChain } from '@transaction/lib/chain';
import { Button, Input, Separator } from '@ui/components';
import { ChangeEvent, useState } from 'react';
import { useDebounce } from '@/wallet/components/hooks/use-debounce';
import { getOwnerHistory } from '@/wallet/lib/hive';
import { useTranslation } from '@/wallet/i18n/client';

export default function RecoveryStep1() {
  const { t } = useTranslation('common_wallet');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [accountSearchResult, setAccountSearchResult] = useState<'default' | 'loading' | 'error'>('default');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const accountSearch = async (name: string) => {
    const chain = await getChain();
    const res = await chain.api.database_api.find_accounts({ accounts: [name], delayed_votes_active: false });
    if (!res.accounts.length) {
      setAccountSearchResult('error');
      setNameError(t('recovery_page.account_not_found'));
    } else {
      const ownerUpdate = res.accounts[0].last_owner_update;
      const ownerUpdateTime = new Date(ownerUpdate).getTime();
      const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();

      if (ownerUpdateTime < THIRTY_DAYS_AGO) {
        setAccountSearchResult('error');
        setNameError(t('recovery_page.owner_not_changed'));
      } else {
        setAccountSearchResult('default');
      }
    }
  };

  const debouncedAccountSearch = useDebounce(accountSearch, 500);

  const onAccountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountSearchResult('loading');
    setAccountName(e.target.value);
    debouncedAccountSearch(e.target.value);
  };

  const validateAccountOwner = async () => {
    const wax = await getChain();
    const pubKey = wax.getPrivateKeyFromPassword(accountName, 'owner', password).associatedPublicKey;
    const history = await getOwnerHistory(accountName);
    const owners = history.filter((h) => {
      const hKey = h.previous_owner_authority.key_auths[0][0];
      return hKey === pubKey;
    });
    return !!owners.length;
  };

  const onSubmit = async () => {
    if (await validateAccountOwner()) {
      setConfirmEmail(true);
    } else {
      setPasswordError(t('recovery_page.password_not_used'));
    }
  };

  const onSubmitEmail = () => {};

  return (
    <div className="m-auto flex max-w-2xl flex-col gap-4 bg-gray-50 p-2 pb-8 dark:bg-slate-950">
      {!confirmEmail ? (
        <>
          <div className="text-2xl font-bold">{t('recovery_page.title')}</div>
          <p className="text-sm leading-relaxed text-primary/60">{t('recovery_page.description')}</p>
          <Separator />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('recovery_page.account_name')}
          </label>
          <Input value={accountName} onChange={onAccountChange} />
          {accountSearchResult === 'error' && (
            <p className="text-sm font-medium text-destructive">{nameError}</p>
          )}
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('recovery_page.recent_password')}
          </label>
          <Input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            type="password"
          />
          {!!passwordError.length && <p className="text-sm font-medium text-destructive">{passwordError}</p>}
          <Button
            variant="redHover"
            className="mt-2 w-fit"
            onClick={onSubmit}
            disabled={
              accountSearchResult === 'error' ||
              accountSearchResult === 'loading' ||
              !accountName.length ||
              !password.length
            }
          >
            {t('recovery_page.begin_recovery')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-primary/60">{t('recovery_page.verify_identity')}</p>
          <Separator />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('recovery_page.email')}
          </label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="redHover" className="mt-2 w-fit" onClick={onSubmitEmail}>
            {t('recovery_page.continue_with_email')}
          </Button>
        </>
      )}
    </div>
  );
}
