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
  const [maxPayout, setMaxPayout] = useState({ type: '', value: '' });
  const [splitRewards, setSplitRewards] = useState(100);
  function handlerMaxPayout(e: string) {
    switch (e) {
      case 'noLimit':
        setMaxPayout({ type: e, value: 'max' });
        break;
      case 'decline':
        setMaxPayout({ type: e, value: '0' });
        break;
      case 'custom':
        setMaxPayout({ type: e, value: '' });
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
            {maxPayout.type === 'custom' && (
              <Input
                type="number"
                value={maxPayout.value}
                onChange={(e) => setMaxPayout({ type: maxPayout.type, value: e.target.value })}
              />
            )}
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
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Who should receive any rewards?</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-5">
                <Input value={splitRewards + '%'} disabled className="w-16" />
                <div className="relative col-span-3">
                  <Input disabled value={username} className="block w-full px-3 py-2.5 pl-11" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <Item />
            </div>
            <Button variant="link" className="h-fit w-fit px-0 py-1 text-xs text-red-500">
              Add account
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Post templates</span>
            <span>Manage your post templates, other settings here will also be saved/loaded.</span>
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
        <DialogFooter>
          <Button type="submit" variant="redHover" disabled>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Item() {
  return (
    <div className="flex items-center gap-5">
      <Input value={'21' + '%'} className="w-16" />
      <div className="relative col-span-3">
        <Input value={'username'} className="block w-full px-3 py-2.5 pl-11" />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.atSign className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
