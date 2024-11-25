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
  id: 'posting' | 'active' | 'owner';
  keys: string[];
  acconts: string[];
}> = ({ open, onOpen, children, onAdd, id, keys, acconts }) => {
  const [newItem, setNewItem] = useState<Item>({ id: id, label: '', threshold: 1, type: 'USER' });

  const validate = () => {
    return acconts.includes(newItem.label)
      ? 'This account already exists in the list'
      : keys.includes(newItem.label)
        ? 'This key already exists in the list'
        : newItem.label === ''
          ? 'This field is required'
          : false;
  };
  const validator = validate();
  const onSubmit = () => {
    if (newItem.type === 'USER') {
      onAdd((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          account_auths: [...prev[id].account_auths, [newItem.label, newItem.threshold]]
        }
      }));
    }
    if (newItem.type === 'KEY') {
      onAdd((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          key_auths: [...prev[id].key_auths, [newItem.label, newItem.threshold]]
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
          <DialogTitle>Add new {id} entry</DialogTitle>
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
                  <SelectItem value="USER">Account</SelectItem>
                  <SelectItem value="KEY">Key</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!!validator} type="submit" onClick={onSubmit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorityDialog;
