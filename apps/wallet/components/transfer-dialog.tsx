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
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { ReactNode } from 'react';

export function TransferDialog({
  children,
  type,
  currency
}: {
  children: ReactNode;
  type: string;
  currency?: string;
}) {
  const title = () => {
    switch (type) {
      case 'transfer':
        return 'Transfer to Account';
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-slate-100">{children}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title()}</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input id="username" defaultValue="@peduarte" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
