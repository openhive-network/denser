import React, { FC, useEffect, useState } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, FileX2, Pencil, Save, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey, handlerError } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { Input } from '@ui/components';
import Link from 'next/link';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import { LevelAuthority } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';

const AuthoritiesGroupItem: FC<{
  item: { keyOrAccount: string; thresholdWeight: number };
  width: number;
  level: LevelAuthority;
  canEdit: boolean;
}> = ({ item, width, level, canEdit }) => {
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
  useEffect(() => {
    if (updateAuthorityMutation.isError) {
      toast({
        title: handlerError(updateAuthorityMutation),
        variant: 'destructive'
      });
    }
  }, [updateAuthorityMutation.isLoading]);
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      <div className="flex items-center">
        {type === 'USER' ? (
          <Link target="_blank" href={`/@${values.keyOrAccount}/authorities`}>
            {values.keyOrAccount}
          </Link>
        ) : (
          <CopyToKeyboard
            value={values.keyOrAccount}
            displayValue={cutPublicKey(values.keyOrAccount, width)}
          />
        )}
      </div>
      <div className="flex w-12 items-center justify-center">
        {editMode ? (
          <Input
            value={values.thresholdWeight}
            type="number"
            onChange={(e) => setValues((prev) => ({ ...prev, thresholdWeight: Number(e.target.value) }))}
          />
        ) : (
          <span>{values.thresholdWeight}</span>
        )}
      </div>
      {editMode ? (
        <div className="flex items-center">
          <Button disabled={disabled} variant="ghost" size="sm" title="Save" onClick={onUpload}>
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </Button>
          <Button disabled={disabled} variant="ghost" size="sm" title="Delete" onClick={onDelete}>
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              <Trash className="h-5 w-5" />
            )}
          </Button>
          <Button
            disabled={disabled}
            variant="ghost"
            title="Cancel"
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
      ) : canEdit ? (
        <div className="flex items-center">
          <div className="h-5 w-5 px-[22px]" />
          <div className="h-5 w-5 px-[22px]" />
          <Button
            variant="ghost"
            type="button"
            size="sm"
            title="Edit"
            onClick={() => {
              setEditMode(true);
            }}
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default AuthoritiesGroupItem;
