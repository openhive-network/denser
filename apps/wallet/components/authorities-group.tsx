import React, { Dispatch, FC, Fragment, SetStateAction, useEffect, useState } from 'react';
import { Button, Separator } from '@ui/components';
import AuthoritiesGroupItem from './authorities-group-item';
import AddAuthorityDialog from './add-authority-dialog';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { useTranslation } from 'next-i18next';
import { KeyAuth } from '../lib/utils';
import NumberInput from './number-input';
import { LevelAuthority } from '@transaction/lib/hive';
import { AuthorityAction } from './hooks/use-authority-operation';

type AuthorityLevel = {
  level: LevelAuthority;
  account_auths: KeyAuth[];
  key_auths: KeyAuth[];
  weight_threshold: number;
};

type GroupProps = {
  data: AuthorityLevel;
  authoritiesActions: AuthorityAction;
  width: number;
  canEdit: boolean;
  isDisabled: boolean;
  accordionControl: Dispatch<SetStateAction<string[]>>;
  authorityUpdated: boolean;
};

const AuthoritesGroup: FC<GroupProps> = ({
  data,
  width,
  canEdit,
  authoritiesActions,
  accordionControl,
  isDisabled,
  authorityUpdated
}) => {
  const { t } = useTranslation('common_wallet');
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState(data.weight_threshold);
  const level = data.level as Exclude<LevelAuthority, 'memo'>;
  const authorityList = [...data.account_auths, ...data.key_auths].map((e) => e.keyOrAccount);
  useEffect(() => {
    if (authorityUpdated) {
      setEditMode(false);
    }
  }, [isDisabled]);
  const handleUpdateKeyOrAccount = (
    keyOrAccount: string,
    newKeyOrAccount: string,
    newThresholdWeight: number
  ) => {
    authoritiesActions({
      type: 'updateKeyOrAccount',
      payload: {
        level,
        keyOrAccount,
        newKeyOrAccount,
        newThresholdWeight
      }
    });
  };
  const handleDeleteAuthority = (keyOrAccount: string) => {
    authoritiesActions({
      type: 'delete',
      payload: {
        level: level,
        keyOrAccount
      }
    });
  };
  return (
    <div className="sm:container">
      <AccordionItem value={level} className="mt-6">
        <div className="flex items-center justify-between">
          <AccordionTrigger>
            <h2>{`${level.charAt(0).toUpperCase() + level.slice(1)} Authority`}</h2>
          </AccordionTrigger>
          <div className="flex items-center gap-2">
            <span className="justify-self-end font-medium">{t('authorities_page.threshold')}:</span>
            <div className="w-12">
              {editMode ? (
                <NumberInput
                  value={value}
                  disabled={isDisabled}
                  onChange={(value) => {
                    setValue(Number(value));
                  }}
                  onBlur={() =>
                    authoritiesActions({
                      type: 'updateThreshold',
                      payload: { level: level, threshold: value }
                    })
                  }
                  className="justify-self-end"
                />
              ) : (
                <span className="flex items-center justify-center justify-self-center">
                  {data.weight_threshold}
                </span>
              )}
            </div>
            <div className="flex w-20 ">
              {!canEdit ? null : editMode ? (
                <Button
                  disabled={isDisabled}
                  variant="outlineRed"
                  className="w-full rounded-none"
                  onClick={() => {
                    setEditMode(false);
                    authoritiesActions({
                      type: 'reset',
                      payload: { level }
                    });
                  }}
                >
                  {t('authorities_page.cancel')}
                </Button>
              ) : (
                <Button
                  disabled={isDisabled}
                  className="w-full rounded-none"
                  onClick={() => {
                    setEditMode(true);
                    accordionControl((prev) => (prev.includes(level) ? prev : [...prev, level]));
                  }}
                >
                  {t('authorities_page.edit')}
                </Button>
              )}
            </div>
          </div>
        </div>
        <AccordionContent>
          <div className="grid w-full grid-cols-[max-content_1fr_max-content_5rem] gap-1">
            <div className="col-span-4 grid grid-cols-subgrid items-center text-xs hover:bg-foreground/20 sm:text-base">
              {canEdit && editMode ? (
                <>
                  <AddAuthorityDialog
                    disabled={isDisabled}
                    authorityList={authorityList}
                    level={level}
                    onAddAuthority={(authority) =>
                      authoritiesActions({
                        type: 'add',
                        payload: {
                          level,
                          ...authority
                        }
                      })
                    }
                  />
                  <span>{t('authorities_page.add_key_account')}</span>
                </>
              ) : (
                <>
                  <div />
                  <div />
                </>
              )}
              <span>{t('authorities_page.weight')}</span>
              <div />
            </div>

            {data.key_auths.map((e) => (
              <Fragment key={e.keyOrAccount}>
                <AuthoritiesGroupItem
                  width={width}
                  item={e}
                  editMode={editMode}
                  disabled={isDisabled}
                  onDeleteAuthority={() => handleDeleteAuthority(e.keyOrAccount)}
                  onUpdateKeyOrAccount={(newKeyOrAccount, newThresholdWeight) =>
                    handleUpdateKeyOrAccount(e.keyOrAccount, newKeyOrAccount, newThresholdWeight)
                  }
                />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}

            {data.account_auths.map((e) => (
              <Fragment key={e.keyOrAccount}>
                <AuthoritiesGroupItem
                  width={width}
                  item={e}
                  editMode={editMode}
                  disabled={isDisabled}
                  onDeleteAuthority={() => handleDeleteAuthority(e.keyOrAccount)}
                  onUpdateKeyOrAccount={(newKeyOrAccount, newThresholdWeight) =>
                    handleUpdateKeyOrAccount(e.keyOrAccount, newKeyOrAccount, newThresholdWeight)
                  }
                />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default AuthoritesGroup;
