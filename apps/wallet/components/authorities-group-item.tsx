import React, { FC } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import Link from 'next/link';
import NumberInput from './number-input';

export type Item = {
  id: string;
  type: 'USER' | 'KEY';
  label: string;
  threshold: number;
};

const AuthoritiesGroupItem: FC<
  Item & {
    onUpdate: (value: number) => void;
    onDelete: (id: string) => void;
    deleteDisabled?: boolean;
    editable: boolean;
    width?: number;
  }
> = ({ id, label, type, threshold, onUpdate, onDelete, deleteDisabled, editable, width }) => {
  const Icon = type === 'USER' ? UserSquare : FileKey;
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      {type === 'USER' ? (
        <Link target="_blank" href={`/@${label}/transfers`} className="flex items-center">
          {label}
        </Link>
      ) : (
        <CopyToKeyboard value={label} displayValue={cutPublicKey(label, width)} />
      )}

      {editable ? (
        <NumberInput
          className="h-6 w-1/2"
          value={threshold}
          onChange={(value) => {
            onUpdate(value);
          }}
        />
      ) : (
        <span>{threshold}</span>
      )}
      {editable ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDelete(id);
            }}
            disabled={deleteDisabled}
          >
            <Trash className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default AuthoritiesGroupItem;
