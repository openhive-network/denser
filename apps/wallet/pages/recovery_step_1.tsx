import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { Button, Input, Separator } from '@ui/components';
import { ChangeEvent, useState } from 'react';
import { useDebounce } from '../components/hooks/use-debounce';
import { getOwnerHistory } from '../lib/hive';
import { createWaxFoundation } from '@hiveio/wax';

const RecoveryStep1 = () => {
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [accountSearchResult, setAccountSearchResult] = useState<'default' | 'loading' | 'error'>('default');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPassworError] = useState('');

  const accountSearch = async (accountName: string) => {
    const chain = await hiveChainService.getHiveChain();
    const res = await chain.api.database_api.find_accounts({ accounts: [accountName] });
    if (!res.accounts.length) {
      setAccountSearchResult('error');
      setNameError('Account not found');
    } else {
      const ownerUpdate = res.accounts[0].last_owner_update;
      const ownerUpdateTime = new Date(ownerUpdate).getTime();
      const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();

      if (ownerUpdateTime < THIRTY_DAYS_AGO) {
        setAccountSearchResult('error');
        setNameError('We are unable to recover this account, it has not changed ownership recently');
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
    const wax = await createWaxFoundation();
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
      setPassworError('This password was not used on this account in the last 30 days.');
    }
  };

  const onSubmitEmail = () => {};

  return (
    <div className="m-auto flex max-w-2xl flex-col gap-4 bg-gray-50 p-2 pb-8 dark:bg-slate-950">
      {!confirmEmail ? (
        <>
          <div className="text-2xl font-bold">Stolen accounts recovery</div>
          <p className="text-sm leading-relaxed text-primary/60">
            From time to time, a Hiver&apos;s owner key may be compromised. Stolen Account Recovery gives the
            rightful account owner 30 days to recover their account from the moment the thief changed their
            owner key. Stolen Account Recovery can only be used on hive.blog if the account owner had
            previously listed &apos;Hive&apos; as their account trustee and complied with Hive&apos;s Terms of
            Service.
          </p>
          <Separator />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Account name
          </label>
          <Input value={accountName} onChange={onAccountChange} />
          {accountSearchResult === 'error' && (
            <p className="text-sm font-medium text-destructive">{nameError}</p>
          )}
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Recent password
          </label>
          <Input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPassworError('');
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
            Begin recovery
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-primary/60">
            We need to verify your identity. Please enter your email address below to begin the verification.
          </p>
          <Separator />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Email
          </label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="redHover" className="mt-2 w-fit" onClick={onSubmitEmail}>
            Continue with email
          </Button>
        </>
      )}
    </div>
  );
};

export default RecoveryStep1;
