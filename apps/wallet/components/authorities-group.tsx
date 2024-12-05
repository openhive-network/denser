import React, { FC, Fragment, useState } from 'react';
import { Button } from '@ui/components/button';
import { PlusCircle } from 'lucide-react';
import { FormField, Input, Separator } from '@ui/components';
import AuthoritiesGroupItem from './authorities-group-item';
import { AuthoritiesProps } from '../pages/[param]/authorities';
import AddAuthorityDialog from './add-authority-dialog';
import useWindowSize from './hooks/use-window-size';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'next-i18next';

type GroupProps = {
  id: 'posting' | 'active' | 'owner';
  editMode: boolean;
  controller: Control<AuthoritiesProps, any>;
  inputDisabled: boolean;
};

const AuthoritesGroup: FC<GroupProps> = ({ id, editMode, controller, inputDisabled }) => {
  const [open, setOpen] = useState(false);
  const { width } = useWindowSize();
  const { t } = useTranslation('common_wallet');
  const acounts = useFieldArray({ control: controller, name: `${id}.account_auths` });
  const keys = useFieldArray({ control: controller, name: `${id}.key_auths` });

  return (
    <div className="container">
      <AccordionItem value={id}>
        <AccordionTrigger>
          <h2>{`${id.charAt(0).toUpperCase() + id.slice(1)} Authority`}</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid w-full grid-cols-[max-content_1fr_1fr_max-content] gap-1">
            <div className="col-span-4 grid grid-cols-subgrid items-center pl-2 text-xs hover:bg-foreground/20 sm:text-base">
              <div className="size-5" />
              <span className="justify-self-end font-medium">{t('authorities_page.threshold')}:</span>
              <FormField
                control={controller}
                name={`${id}.weight_threshold`}
                render={({ field }) => (
                  <>
                    {editMode ? (
                      <Input
                        value={field.value}
                        type="number"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="h-6 w-1/2 self-center justify-self-center bg-white/10 p-0 px-3"
                        disabled={inputDisabled}
                      />
                    ) : (
                      <span className="justify-self-center">{field.value}</span>
                    )}
                  </>
                )}
              />
              {editMode ? (
                <FormField
                  control={controller}
                  name={id}
                  render={({ field }) => (
                    <AddAuthorityDialog
                      onAddAccount={(item) => acounts.append(item)}
                      onAddKey={(item) => keys.append(item)}
                      id={id}
                      open={open}
                      onOpen={(e) => setOpen(e)}
                      acconts={field.value.account_auths.map((e) => e.account)}
                      keys={field.value.key_auths.map((e) => e.key)}
                      t={t}
                    >
                      <Button variant="ghost" size="sm">
                        <PlusCircle className="h-5 w-5 cursor-pointer" />
                      </Button>
                    </AddAuthorityDialog>
                  )}
                />
              ) : null}
            </div>

            {keys.fields.map((field, index) => (
              <Fragment key={index}>
                <AuthoritiesGroupItem
                  inputDisabled={inputDisabled}
                  width={width}
                  threshold={field.threshold}
                  label={field.key}
                  type="KEY"
                  editMode={editMode}
                  onUpdateThreshold={(e) => keys.update(index, { ...field, threshold: e })}
                  onUpdateEntry={(e) => keys.update(index, { ...field, key: e.toString() })}
                  onDelete={() => {
                    keys.remove(index);
                  }}
                />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}

            {acounts.fields.map((field, index) => (
              <Fragment key={index}>
                <AuthoritiesGroupItem
                  inputDisabled={inputDisabled}
                  width={width}
                  threshold={field.threshold}
                  label={field.account}
                  type="USER"
                  editMode={editMode}
                  onUpdateThreshold={(e) => acounts.update(index, { ...field, threshold: e })}
                  onUpdateEntry={(e) => acounts.update(index, { ...field, account: e })}
                  onDelete={() => {
                    acounts.remove(index);
                  }}
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
