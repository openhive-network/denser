import React, { FC } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { Input } from '@ui/components';
import Link from 'next/link';

const AuthoritiesGroupItem: FC<{
  onUpdateThreshold: (value: number) => void;
  onUpdateEntry: (value: string) => void;
  onDelete: () => void;
  editMode: boolean;
  width?: number;
  type: string;
  label: string;
  threshold: number;
  inputDisabled: boolean;
}> = ({
  type,
  label,
  threshold,
  onUpdateThreshold,
  onUpdateEntry,
  onDelete,
  width,
  editMode,
  inputDisabled
}) => {
  const Icon = type === 'USER' ? UserSquare : FileKey;

  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      {editMode ? (
        <Input value={label} onChange={(e) => onUpdateEntry(e.target.value)} disabled={inputDisabled} />
      ) : type === 'USER' ? (
        <Link
          target="_blank"
          href={`/@${label}/authorities`}
          className="flex w-fit cursor-pointer items-center"
        >
          {label}
        </Link>
      ) : (
        <CopyToKeyboard value={label} displayValue={cutPublicKey(label, width)} />
      )}

      {editMode ? (
        <Input
          value={threshold}
          type="number"
          onChange={(e) => onUpdateThreshold(Number(e.target.value))}
          className="h-6 w-1/2 self-center justify-self-center bg-white/10 p-0 px-3"
          disabled={inputDisabled}
        />
      ) : (
        <span className="justify-self-center">{threshold}</span>
      )}
      {editMode ? (
        <div className="flex items-center">
          <Button
            disabled={inputDisabled}
            variant="ghost"
            type="button"
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