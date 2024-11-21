import {
  Dialog,
  DialogTrigger,
  Button,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Dispatch, FC, ReactNode, SetStateAction, useState } from 'react';
import { AuthoritiesProps } from '../pages/[param]/authorities';
import { Item } from './authorities-group-item';
import NumberInput from './number-input';

const AddAuthorityDialog: FC<{
  open: boolean;
  onOpen: (e: boolean) => void;
  children: ReactNode;
  onAdd: Dispatch<SetStateAction<AuthoritiesProps>>;
  id: string;
}> = ({ open, onOpen, children, onAdd, id }) => {
  const [newItem, setNewItem] = useState<Item>({ id: id, label: '', threshold: 1, type: 'USER' });
  const onSubmit = () => {
    if (newItem.type === 'USER') {
      id === 'posting'
        ? onAdd((prev) => ({
            ...prev,
            posting: {
              ...prev.posting,
              account_auths: [...prev.posting.account_auths, [newItem.label, newItem.threshold]]
            }
          }))
        : id === 'active'
          ? onAdd((prev) => ({
              ...prev,
              active: {
                ...prev.active,
                account_auths: [...prev.active.account_auths, [newItem.label, newItem.threshold]]
              }
            }))
          : onAdd((prev) => ({
              ...prev,
              owner: {
                ...prev.owner,
                account_auths: [...prev.owner.account_auths, [newItem.label, newItem.threshold]]
              }
            }));
    }
    if (newItem.type === 'KEY') {
      id === 'posting'
        ? onAdd((prev) => ({
            ...prev,
            posting: {
              ...prev.posting,
              key_auths: [...prev.posting.key_auths, [newItem.label, newItem.threshold]]
            }
          }))
        : id === 'active'
          ? onAdd((prev) => ({
              ...prev,
              active: {
                ...prev.active,
                key_auths: [...prev.active.key_auths, [newItem.label, newItem.threshold]]
              }
            }))
          : onAdd((prev) => ({
              ...prev,
              owner: {
                ...prev.owner,
                key_auths: [...prev.owner.key_auths, [newItem.label, newItem.threshold]]
              }
            }));
    }
    onOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Authority</DialogTitle>
          <DialogDescription>New {id} authority will be added to the list.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {newItem.type === 'USER' ? 'Username' : 'Key'}
            </Label>
            <Input
              id="name"
              className="col-span-3"
              value={newItem.label}
              onChange={(e) => setNewItem((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              Threshold
            </Label>
            <NumberInput
              id="threshold"
              className="col-span-3 w-full"
              value={newItem.threshold}
              onChange={(value) => {
                setNewItem({ ...newItem, threshold: value });
              }}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
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
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="KEY">Key</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={newItem.label === ''} type="submit" onClick={onSubmit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorityDialog;
