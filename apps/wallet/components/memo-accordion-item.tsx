import { AccordionContent, AccordionItem, AccordionTrigger, Button } from '@ui/components';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { AuthorityAction } from './hooks/use-authority-operation';
import MemoAuthorityValue from './memo-authority-value';

const MemoAccordionItem = ({
  memo,
  width,
  canEdit,
  isDisabled,
  authorityUpdated,
  accordionControl,
  authoritiesActions
}: {
  memo: { value: string };
  width: number;
  canEdit: boolean;
  isDisabled: boolean;
  authorityUpdated: boolean;
  accordionControl: Dispatch<SetStateAction<string[]>>;
  authoritiesActions: AuthorityAction;
}) => {
  const { t } = useTranslation('common_wallet');
  const [editMode, setEditMode] = useState(false);
  useEffect(() => {
    if (authorityUpdated) {
      setEditMode(false);
    }
  }, [isDisabled]);

  return (
    <div className="sm:container">
      <AccordionItem value="memo" className="mt-6">
        <div className="flex items-center justify-between">
          <AccordionTrigger>
            <h2>{t('authorities_page.memo_key')}</h2>
          </AccordionTrigger>
          <div>
            {!canEdit ? null : editMode ? (
              <Button
                variant="outlineRed"
                disabled={isDisabled}
                className="rounded-none"
                onClick={() => {
                  setEditMode(false);
                  authoritiesActions({
                    type: 'reset',
                    payload: { level: 'memo' }
                  });
                }}
              >
                {t('authorities_page.cancel')}
              </Button>
            ) : (
              <Button
                className="w-20 rounded-none"
                disabled={isDisabled}
                onClick={() => {
                  setEditMode(true);
                  accordionControl((prev) => (prev.includes('memo') ? prev : [...prev, 'memo']));
                }}
              >
                {t('authorities_page.edit')}
              </Button>
            )}
          </div>
        </div>
        <AccordionContent>
          <MemoAuthorityValue
            editMode={editMode && canEdit}
            isDisabled={isDisabled}
            width={width}
            memo={memo}
            authoritiesActions={authoritiesActions}
          />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default MemoAccordionItem;
