import { Input, Separator } from '@ui/components';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@ui/components/dialog';
import { ReactNode, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hive/ui/components/select';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';

export function AdvancedSettingsPostForm({ children, username }: { children: ReactNode; username: string }) {
  const [rewards, setRewards] = useState('50%');
  const [maxPayout, setMaxPayout] = useState<string | null>(null);
  const [items, setItems] = useState<{ percent: number; username: string }[]>([]);
  const [splitRewards, setSplitRewards] = useState(100);

  const handleAddAccount = () => {
    setItems([...items, { percent: 0, username: '' }]);
  };

  const handleDeleteItem = (index: number, percent: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });

    setSplitRewards((prev) => prev + percent);
  };

  const handleChangePercent = (index: number, percentChange: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index].percent = percentChange;
      return newItems;
    });

    setSplitRewards((prev) => prev - percentChange);
  };
  function handlerMaxPayout(e: string) {
    switch (e) {
      case 'noLimit':
        setMaxPayout(null);
        break;
      case 'decline':
        setMaxPayout('0');
        setRewards('0%');
        break;
      case 'custom':
        setMaxPayout('');
        break;
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-full overflow-scroll sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Advanced settings</DialogTitle>
          <Separator />
        </DialogHeader>
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Maximum Accepted Payout</span>
            <span>HBD value of the maximum payout this post will receive.</span>
            <div className="flex flex-col gap-1">
              <Select onValueChange={(e) => handlerMaxPayout(e)} defaultValue="noLimit">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noLimit">No limit</SelectItem>
                  <SelectItem value="decline">Decline Payout</SelectItem>
                  <SelectItem value="custom">Custom value</SelectItem>
                </SelectContent>
              </Select>
              {typeof maxPayout === 'string' && (
                <Input
                  type="number"
                  value={maxPayout ? maxPayout : ''}
                  onChange={(e) => setMaxPayout(e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Author rewards</span>
            <span>What type of tokens do you want as rewards from this post?</span>
            <Select defaultValue={rewards} onValueChange={(e) => setRewards(e)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                <SelectItem value="100%">Power up 100%</SelectItem>
              </SelectContent>
            </Select>
            <span>Default: {'50% HBD / 50% HP'}</span>
            <Link href={`/@${username}/settings`} className="text-red-500">
              Update
            </Link>
          </div>
          <div>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-5">
                <Input value={splitRewards + '%'} disabled className="w-16" />
                <div className="relative col-span-3">
                  <Input disabled value={'username'} className="block w-full px-3 py-2.5 pl-11" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </li>
              {items.map((item, index) => (
                <div className="flex" key={index}>
                  <Item onChangePercent={(percentChange) => handleChangePercent(index, percentChange)} />
                  <Button
                    variant="link"
                    size="xs"
                    className="text-red-500"
                    onClick={() => handleDeleteItem(index, item.percent)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </ul>

            {items.length < 8 ? (
              <Button
                variant="link"
                className="h-fit w-fit px-0 py-1 text-xs text-red-500"
                onClick={handleAddAccount}
              >
                Add Account
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Post templates</span>
            <span>Manage your post templates, other settings here will also be saved/loaded.</span>
            <div className="flex flex-col gap-1">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Name of a new template" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" variant="redHover" disabled>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Item({ onChangePercent }: { onChangePercent: (percentChange: number) => void }) {
  const [user, setUser] = useState({ percent: '0', username: '' });

  return (
    <li className="flex items-center gap-5">
      <Input
        value={user.percent}
        className="w-16"
        onChange={(e) => {
          setUser((prev) => {
            return { ...prev, percent: e.target.value };
          });
          const percentChange = parseInt(e.target.value, 10);
          if (!isNaN(percentChange) && percentChange !== 0) {
            onChangePercent(percentChange);
          }
        }}
      />
      <div className="relative col-span-3">
        <Input
          value={user.username}
          className="block w-full px-3 py-2.5 pl-11"
          onChange={(e) => {
            setUser((prev) => {
              return { ...prev, username: e.target.value };
            });
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.atSign className="h-5 w-5" />
        </div>
      </div>
    </li>
  );
}
