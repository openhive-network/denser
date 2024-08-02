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
import { ReactNode, useCallback, useState } from 'react';
import { Autocompleter } from './autocompleter';
import badActorList from '@ui/config/lists/bad-actor-list';
import { useTransferHiveMutation, useTransferToSavingsMutation } from './hooks/use-transfer-hive-mutation';
import { usePowerDownMutation, usePowerUpMutation } from './hooks/use-power-hive-mutation';
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { handleError } from '@ui/lib/utils';

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
  currency: string;
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
    onSubmit: new Function()
  };
  const [curr, setCurr] = useState(currency);
  const [value, setValue] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [data, setData] = useState(defaultValue);
  const badActors = badActorList.includes(data.to);
  const transferMutation = useTransferHiveMutation();
  const transferToSavingsMutation = useTransferToSavingsMutation();
  const powerUpMutation = usePowerUpMutation();
  const powerDownMutation = usePowerDownMutation();
  const delegateMutation = useDelegateMutation();

  const getAsset = useCallback(
    async (value: string) => {
      const chain = await hiveChainService.getHiveChain();
      const amount = Number(value) * 1000;
      return curr === 'hive' ? chain.hive(amount) : chain.hbd(amount);
    },
    [curr]
  );

  switch (type) {
    case 'transfers':
      data.title = 'Transfer to Account';
      data.description = 'Move funds to another Hive account.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.onSubmit = async () => {
        const params = { fromAccount: username, toAccount: data.to, memo: '', amount: await getAsset(value) };
        try {
          transferMutation.mutateAsync(params);
        } catch (error) {
          handleError(error, { method: 'transfer', params });
        }
      };
      break;

    case 'transferTo':
      data.title = 'Transfer to Savings';
      data.description = 'Protect funds by requiring a 3 day withdraw waiting period.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.to = username || '';
      data.onSubmit = async () => {
        const params = { amount: await getAsset(value), fromAccount: data.to, toAccount: data.to, memo: '' };
        try {
          transferToSavingsMutation.mutateAsync(params);
        } catch (error) {
          handleError(error, { method: 'transferToSavings', params });
        }
      };
      break;

    case 'powerUp':
      data.title = 'Convert to HIVE POWER';
      data.description =
        'Influence tokens which give you more control over post payouts and allow you to earn on curation rewards. HIVE POWER is non-transferable and requires 3 months (13 payments) to convert back to Hive.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.to = username || '';
      data.selectCurr = false;
      data.buttonTitle = 'Power Up';
      data.onSubmit = async () => {
        const params = { account: username, amount: await getAsset(value) };
        try {
          powerUpMutation.mutateAsync(params);
        } catch (error) {
          handleError(error, { method: 'powerUp', params });
        }
      };
      break;

    case 'powerDown':
      data.title = 'Power Down';
      data.description = '';
      data.buttonTitle = 'Power Down';
      data.onSubmit = async () => {
        const params = { account: username, vestingShares: await getAsset(value) };
        try {
          powerDownMutation.mutateAsync(params);
        } catch (error) {
          handleError(error, { method: 'powerDown', params });
        }
      };
      break;

    case 'delegate':
      data.title = 'Delegate to Account';
      data.description = '';
      data.amount = amount.hp;
      data.onSubmit = async () => {
        const params = { delegator: username, delegatee: data.to, vestingShares: await getAsset(value) };
        try {
          delegateMutation.mutateAsync(params);
        } catch (error) {
          handleError(error, { method: 'delegate', params });
        }
      };
      break;

    case 'withdrawHive':
      data.title = 'Savings Withdraw';
      data.description = 'Withdraw funds after the required 3 day waiting period.';
      data.amount = amount.savingsHive;
      data.to = username || '';
      data.advancedBtn = true;
      break;

    case 'withdrawHiveDollars':
      data.title = 'Savings Withdraw';
      data.description = 'Withdraw funds after the required 3 day waiting period.';
      data.amount = amount.savingsHbd;
      data.to = username || '';
      data.advancedBtn = true;
      break;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-slate-100">{children}</span>
      </DialogTrigger>
      <DialogContent className="text-left sm:max-w-[425px]">
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
                  <Autocompleter value={data.to} onChange={(e) => setData({ ...data, to: e })} />
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
                without converting back to Hive.
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-4 items-center gap-4">
            Amount
            <div className="relative col-span-3">
              {data.selectCurr && (
                <div className="absolute right-0">
                  <Select name="amout right-0" value={curr} onValueChange={(e) => setCurr(e)}>
                    <SelectTrigger className="w-fit" onSelect={() => setCurr('hive')}>
                      <SelectValue placeholder={curr} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="hive">Hive</SelectItem>
                        <SelectItem value="hbd">HBD</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Input
                placeholder="Amount"
                className="text-stale-900 block w-full px-3 py-2.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
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
                <Input placeholder="Memo" className="col-span-3" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          <Button variant="redHover" className="w-fit" disabled={badActors} onClick={() => data.onSubmit()}>
            {data.buttonTitle}
          </Button>
          {data.advancedBtn && (
            <Button className="w-fit" variant="ghost" onClick={() => setAdvanced(!advanced)}>
              {advanced ? <span>Basic</span> : <span>Advanced</span>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
