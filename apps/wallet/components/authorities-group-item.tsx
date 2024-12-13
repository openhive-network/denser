import React, { FC, useState } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, FileX2, Pencil, Save, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { Input } from '@ui/components';
import Link from 'next/link';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import { LevelAuthority } from '@transaction/index';

const AuthoritiesGroupItem: FC<{
  item: { keyOrAccount: string; thresholdWeight: number };
  width: number;
  level: LevelAuthority;
}> = ({ item, width, level }) => {
  const updateAuthorityMutation = useUpdateAuthorityMutation();
  const type = item.keyOrAccount.startsWith('ST') ? 'KEY' : 'USER';
  const Icon = type === 'USER' ? UserSquare : FileKey;
  const [values, setValues] = useState(item);
  const [editMode, setEditMode] = useState(false);

  const onUpload = () => {
    updateAuthorityMutation.mutate(
      {
        level: level,
        action: { type: 'replace', payload: values }
      },
      {
        onSuccess: () => {
          setEditMode(false);
        }
      }
    );
  };
  const onDelete = () => {
    updateAuthorityMutation.mutate(
      {
        level: level,
        action: { type: 'remove', payload: values }
      },
      {
        onSuccess: () => {
          setEditMode(false);
        }
      }
    );
  };
  const disabled = updateAuthorityMutation.isLoading;
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      {editMode ? (
        <Input
          value={values.keyOrAccount}
          onChange={(e) => setValues((prev) => ({ ...prev, keyOrAccount: e.target.value }))}
        />
      ) : type === 'USER' ? (
        <Link
          target="_blank"
          href={`/@${values.keyOrAccount}/authorities`}
          className="flex w-fit cursor-pointer items-center"
        >
          {values.keyOrAccount}
        </Link>
      ) : (
        <CopyToKeyboard value={values.keyOrAccount} displayValue={cutPublicKey(values.keyOrAccount, width)} />
      )}

      {editMode ? (
        <Input
          value={values.thresholdWeight}
          onChange={(e) => setValues((prev) => ({ ...prev, thresholdWeight: Number(e.target.value) }))}
          className="h-6 self-center justify-self-center bg-white/10 p-0 px-3"
        />
      ) : (
        <span className="justify-self-center">{values.thresholdWeight}</span>
      )}
      {editMode ? (
        <div className="flex items-center">
          <Button
            disabled={disabled}
            variant="ghost"
            type="button"
            size="sm"
            title="Delete"
            onClick={onUpload}
          >
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </Button>
          <Button
            disabled={disabled}
            variant="ghost"
            type="button"
            size="sm"
            title="Delete"
            onClick={onDelete}
          >
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              <Trash className="h-5 w-5" />
            )}
          </Button>
          <Button
            disabled={disabled}
            variant="ghost"
            type="button"
            size="sm"
            onClick={() => {
              setEditMode(false);
              setValues(item);
            }}
          >
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              <FileX2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="h-5 w-5 px-[22px]" />
          <div className="h-5 w-5 px-[22px]" />
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={() => {
              setEditMode(true);
            }}
            title="Edit"
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthoritiesGroupItem;
