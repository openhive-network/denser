import { Button, FormLabel, Input, Separator } from '@ui/components';
import { useState } from 'react';

const RecoveryStep1 = () => {
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);

  const onSubmit = () => {
    setConfirmEmail(true);
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
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Recent password
          </label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <Button variant="redHover" className="mt-2 w-fit" onSubmit={onSubmit}>
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
