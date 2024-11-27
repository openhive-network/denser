import React, { FC } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import UserInfoPopover from './user-info-popover';
import { Input } from '@ui/components';

const AuthoritiesGroupItem: FC<{
  onUpdateThreshold: (value: number) => void;
  onUpdateEntry: (value: string) => void;
  onDelete: () => void;
  editMode: boolean;
  width?: number;
  type: string;
  label: string;
  threshold: number;
}> = ({ type, label, threshold, onUpdateThreshold, onUpdateEntry, onDelete, width, editMode }) => {
  const Icon = type === 'USER' ? UserSquare : FileKey;
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      {editMode ? (
        <Input value={label} onChange={(e) => onUpdateEntry(e.target.value)} />
      ) : type === 'USER' ? (
        <UserInfoPopover username={label} />
      ) : (
        <CopyToKeyboard value={label} displayValue={cutPublicKey(label, width)} />
      )}

      {editMode ? (
        <Input
          value={threshold}
          type="number"
          onChange={(e) => onUpdateThreshold(Number(e.target.value))}
          className="h-6 w-1/2 self-center justify-self-center bg-white/10 p-0 px-3"
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
              onDelete();
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
