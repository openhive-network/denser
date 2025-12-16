import React, { FC, useEffect, useState } from 'react';
import { Button } from '@ui/components/button';
import { FileKey, Trash, UserSquare } from 'lucide-react';
import { cutPublicKey } from '@/wallet/lib/utils';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { Input } from '@ui/components';
import { Link } from '@hive/ui';
import ButtonTooltip from './button-tooltip';
import NumberInput from './number-input';
import { useTranslation } from 'next-i18next';

const AuthoritiesGroupItem: FC<{
  item: { keyOrAccount: string; thresholdWeight: number };
  width: number;
  editMode: boolean;
  disabled: boolean;
  onDeleteAuthority: () => void;
  onUpdateKeyOrAccount: (newKeyOrAccount: string, newThresholdWeight: number) => void;
}> = ({ item, width, editMode, disabled, onDeleteAuthority, onUpdateKeyOrAccount }) => {
  const [itemValue, setItemValue] = useState(item);

  useEffect(() => {
    setItemValue(item);
  }, [item]);
  const { t } = useTranslation('common_wallet');
  const type = itemValue.keyOrAccount.startsWith('STM') ? 'KEY' : 'USER';
  const Icon = type === 'USER' ? UserSquare : FileKey;
  const handleUpdateItem = () => {
    onUpdateKeyOrAccount(itemValue.keyOrAccount, itemValue.thresholdWeight);
  };
  return (
    <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="flex items-center">
        <Icon className="size-5" />
      </div>
      <div className="flex items-center">
        {editMode ? (
          <Input
            value={itemValue.keyOrAccount}
            disabled={disabled}
            onChange={(e) =>
              setItemValue((prev) => ({
                ...prev,
                keyOrAccount: e.target.value
              }))
            }
            onBlur={handleUpdateItem}
          />
        ) : type === 'USER' ? (
          <Link target="_blank" href={`/@${itemValue.keyOrAccount}/authorities`}>
            {itemValue.keyOrAccount}
          </Link>
        ) : (
          <CopyToKeyboard
            value={itemValue.keyOrAccount}
            displayValue={cutPublicKey(itemValue.keyOrAccount, width)}
          />
        )}
      </div>
      <div className="flex w-12 items-center justify-center">
        {editMode ? (
          <NumberInput
            disabled={disabled}
            value={itemValue.thresholdWeight}
            onChange={(e) => setItemValue((prev) => ({ ...prev, thresholdWeight: Number(e) }))}
            onBlur={handleUpdateItem}
          />
        ) : (
          <span>{itemValue.thresholdWeight}</span>
        )}
      </div>
      <div className="flex w-20 items-center justify-end">
        {editMode ? (
          <ButtonTooltip label={t('authorities_page.delete')}>
            <Button disabled={disabled} variant="ghost" size="sm" onClick={onDeleteAuthority}>
              <Trash className="h-5 w-5" />
            </Button>
          </ButtonTooltip>
        ) : (
          <div className="h-5 w-5 px-[22px]" />
        )}
      </div>
    </div>
  );
};

export default AuthoritiesGroupItem;
