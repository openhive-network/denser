import { AccordionContent, AccordionItem, AccordionTrigger, Button, Input } from '@ui/components';
import { FileKey, FileX2, Pencil, Save, Trash } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { cutPublicKey } from '@/wallet/lib/utils';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import ButtonTooltip from './button-tooltip';

const MemoAccordionItem = ({ memo, width, canEdit }: { memo: string; width: number; canEdit: boolean }) => {
  const { t } = useTranslation('common_wallet');
  const [editMemo, setEditMemo] = useState(false);
  const [value, setValue] = useState<string>(memo);
  const updateMemoMutation = useUpdateAuthorityMutation();
  const onUpdateMemo = () => {
    updateMemoMutation.mutate(
      {
        level: 'memo',
        action: { type: 'setMemoKey', payload: { key: value } }
      },
      {
        onSuccess: () => {
          setEditMemo(false);
        }
      }
    );
  };
  const disabled = updateMemoMutation.isLoading;
  return (
    <div className="sm:container">
      <AccordionItem value="memo" className="mt-6">
        <AccordionTrigger>
          <h2>Memo Authority</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex justify-between pl-2 text-xs hover:bg-foreground/20 sm:text-base">
            <div className="flex gap-2">
              <span className="flex items-center">
                <FileKey className="size-5" />
              </span>
              {editMemo ? (
                <Input
                  disabled={disabled}
                  className="sm:w-[500px]"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              ) : (
                <CopyToKeyboard value={value} displayValue={cutPublicKey(value, width)} />
              )}
              <span />
            </div>
            {editMemo ? (
              <div className="flex items-center">
                <ButtonTooltip label="Save">
                  <Button disabled={disabled} variant="ghost" type="button" size="sm" onClick={onUpdateMemo}>
                    {disabled ? (
                      <CircleSpinner loading={disabled} size={18} color="#dc2626" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                  </Button>
                </ButtonTooltip>
                <Button
                  disabled={disabled}
                  variant="ghost"
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditMemo(false);
                    setValue(memo);
                  }}
                >
                  <FileX2 className="h-5 w-5" />
                </Button>
              </div>
            ) : canEdit ? (
              <div className="flex items-center">
                <ButtonTooltip label="Edit">
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditMemo(true);
                    }}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                </ButtonTooltip>
              </div>
            ) : null}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};
export default MemoAccordionItem;
