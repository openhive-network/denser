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
import { ReactNode, useState } from 'react';

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
  username?: string;
}) {
  const data = {
    title: '',
    description: '',
    amount: '',
    advancedBtn: false,
    selectCurr: true,
    buttonTitle: 'Next',
    to: ''
  };
  const [curr, setCurr] = useState(currency);
  const [value, setValue] = useState('');
  const [advanced, setAdvanced] = useState(false);
  switch (type) {
    case 'transfers':
      data.title = 'Transfer to Account';
      data.description = 'Move funds to another Hive account.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      break;
    case 'transferTo':
      data.title = 'Transfer to Savings';
      data.description = 'Protect funds by requiring a 3 day withdraw waiting period.';
      data.amount = curr === 'hive' ? amount.hive : amount.hbd;
      data.advancedBtn = true;
      data.to = username || '';
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
      break;
    case 'powerDown':
      data.title = 'Power Down';
      data.description = '';
      data.buttonTitle = 'Power Down';
      break;
    case 'delegate':
      data.title = 'Delegate to Account';
      data.description = '';
      data.amount = amount.hp;
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
  const [addressee, setAddressee] = useState(data.to);

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
            <div className="grid grid-cols-4 items-center gap-4">
              To
              <div className="relative col-span-3">
                <Input
                  className="text-stale-900 block w-full px-3 py-2.5 pl-11"
                  value={addressee}
                  onChange={(e) => setAddressee(e.target.value)}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icons.atSign className="h-5 w-5" />
                </div>
              </div>
            </div>
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
          <Button variant="redHover" className="w-fit">
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
