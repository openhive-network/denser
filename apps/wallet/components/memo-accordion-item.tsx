import { AccordionContent, AccordionItem, AccordionTrigger, Button, Input } from '@ui/components';
import { FileKey, FileX2, Pencil, Save, Trash } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import CopyToKeyboard from '@/wallet/components/copy-to-keyboard';
import { cutPublicKey, handleAuthorityError } from '@/wallet/lib/utils';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import ButtonTooltip from './button-tooltip';
import { toast } from '@ui/components/hooks/use-toast';

const MemoAccordionItem = ({ memo, width, canEdit }: { memo: string; width: number; canEdit: boolean }) => {
  const { t } = useTranslation('common_wallet');
  const [isEditing, setIsEditing] = useState(false);
  const [memoValue, setMemoValue] = useState<string>(memo);
  const updateMemoMutation = useUpdateAuthorityMutation();

  const handleUpdateMemo = () => {
    updateMemoMutation.mutate(
      {
        level: 'memo',
        action: { type: 'setMemoKey', payload: { key: memoValue } }
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        }
      }
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMemoValue(memo);
  };

  const isDisabled = updateMemoMutation.isLoading;

  useEffect(() => {
    if (updateMemoMutation.isError) {
      toast({
        title: handleAuthorityError(updateMemoMutation),
        variant: 'destructive'
      });
    }
  }, [updateMemoMutation.isLoading]);

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
              {isEditing ? (
                <Input
                  disabled={isDisabled}
                  className="sm:w-[500px]"
                  value={memoValue}
                  onChange={(e) => setMemoValue(e.target.value)}
                />
              ) : (
                <CopyToKeyboard value={memoValue} displayValue={cutPublicKey(memoValue, width)} />
              )}
              <span />
            </div>
            {isEditing ? (
              <div className="flex items-center">
                <ButtonTooltip label="Save">
                  <Button
                    disabled={isDisabled}
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={handleUpdateMemo}
                  >
                    {isDisabled ? (
                      <CircleSpinner loading={isDisabled} size={18} color="#dc2626" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                  </Button>
                </ButtonTooltip>
                <div className="h-5 w-5 px-[22px]" />
                <ButtonTooltip label="Cancel">
                  <Button disabled={isDisabled} variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <FileX2 className="h-5 w-5" />
                  </Button>
                </ButtonTooltip>
              </div>
            ) : canEdit ? (
              <div className="flex items-center">
                <ButtonTooltip label="Edit">
                  <Button variant="ghost" type="button" size="sm" onClick={() => setIsEditing(true)}>
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
