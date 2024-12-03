import {
  Dialog,
  DialogTrigger,
  Button,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components';
import { TFunction } from 'next-i18next';
import { FC, ReactNode, useState } from 'react';

type Item = { label: string; threshold: number; type: 'USER' | 'KEY' };
const AddAuthorityDialog: FC<{
  open: boolean;
  onOpen: (e: boolean) => void;
  children: ReactNode;
  onAddKey: (item: { account: string; threshold: number }) => void;
  onAddAccount: (item: { account: string; threshold: number }) => void;
  id: 'posting' | 'active' | 'owner';
  keys: string[];
  acconts: string[];
  t: TFunction;
}> = ({ open, onOpen, children, onAddKey, onAddAccount, id, keys, acconts, t }) => {
  const [newItem, setNewItem] = useState<Item>({ label: '', threshold: 1, type: 'USER' });
  const validate = () => {
    return acconts.includes(newItem.label)
      ? t('authorities_page.account_exists_error')
      : keys.includes(newItem.label)
        ? t('authorities_page.key_exists_error')
        : newItem.label === ''
          ? t('authorities_page.field_required')
          : false;
  };
  const validator = validate();
  const onSubmit = () => {
    if (newItem.type === 'USER') {
      onAddAccount({ account: newItem.label, threshold: newItem.threshold });
    }
    if (newItem.type === 'KEY') {
      onAddKey({ account: newItem.label, threshold: newItem.threshold });
    }
    onOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('authorities_page.add_item_title', { id: id })}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
            <Label htmlFor="name" className="text-right">
              {newItem.type === 'USER' ? 'Account' : 'Key'}
            </Label>
            <Input
              id="name"
              className="col-span-3"
              value={newItem.label}
              onChange={(e) => setNewItem((prev) => ({ ...prev, label: e.target.value }))}
            />
            {validator && (
              <span className="col-span-3 col-start-2 text-xs text-destructive">{validator}</span>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              {t('authorities_page.threshold')}
            </Label>
            <Input
              value={newItem.threshold}
              type="number"
              onChange={(value) => {
                setNewItem({ ...newItem, threshold: Number(value.target.value) });
              }}
              className="col-span-3 w-full self-center justify-self-center bg-white/10 p-0 px-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t('authorities_page.type')}
            </Label>
            <Select
              value={newItem.type}
              onValueChange={(e: 'USER' | 'KEY') => setNewItem((prev) => ({ ...prev, type: e }))}
            >
              <SelectTrigger className="col-span-3 w-full" id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="USER">{t('authorities_page.account')}</SelectItem>
                  <SelectItem value="KEY">{t('authorities_page.key')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!!validator} type="submit" onClick={onSubmit}>
            {t('authorities_page.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorityDialog;
