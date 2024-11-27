import React, { FC } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import NumberInput from './number-input';
import UserInfoPopover from './user-info-popover';
import { Input } from '@ui/components';

export type Item = {
  id: string;
  type: 'USER' | 'KEY';
  label: string;
  threshold: number;
};

const AuthoritiesGroupItem: FC<
  Item & {
    onUpdateThreshold: (value: number) => void;
    onUpdateEntry: (id: string) => void;
    onDelete: (id: string) => void;
    editMode: boolean;
    width?: number;
  }
> = ({ id, label, type, threshold, onUpdateThreshold, onUpdateEntry, onDelete, width, editMode }) => {
  const Icon = type === 'USER' ? UserSquare : FileKey;
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      {editMode ? (
        <Input
          value={label}
          onChange={(value) => {
            onUpdateEntry(value.target.value);
          }}
        />
      ) : type === 'USER' ? (
        <UserInfoPopover username={label} />
      ) : (
        <CopyToKeyboard value={label} displayValue={cutPublicKey(label, width)} />
      )}

      {editMode ? (
        <NumberInput
          className="h-6 w-1/2"
          value={threshold}
          onChange={(value) => {
            onUpdateThreshold(value);
          }}
        />
      ) : (
        <span className="justify-self-center">{threshold}</span>
      )}
      {editMode ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDelete(id);
            }}
          >
            <Trash className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default AuthoritiesGroupItem;
