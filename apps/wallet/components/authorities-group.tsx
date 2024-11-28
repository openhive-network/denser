import React, { FC, Fragment, useState } from 'react';
import { Button } from '@ui/components/button';
import { PlusCircle } from 'lucide-react';
import { FormField, Input, Separator } from '@ui/components';
import AuthoritiesGroupItem from './authorities-group-item';
import { AuthoritiesProps } from '../pages/[param]/authorities';
import AddAuthorityDialog from './add-authority-dialog';
import useWindowSize from './hooks/use-window-size';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { Control, useFormContext } from 'react-hook-form';
type GroupProps = {
  id: 'posting' | 'active' | 'owner';
  editMode: boolean;
  controller: Control<AuthoritiesProps, any>;
};

const AuthoritesGroup: FC<GroupProps> = ({ id, editMode, controller }) => {
  const [open, setOpen] = useState(false);
  const { width } = useWindowSize();
  const { setValue } = useFormContext();

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
              <span className="justify-self-end font-medium">Threshold:</span>
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
                      onAddAccount={(item) =>
                        setValue(`${id}.account_auths`, [...field.value.account_auths, item])
                      }
                      onAddKey={(item) => setValue(`${id}.key_auths`, [...field.value.key_auths, item])}
                      id={id}
                      open={open}
                      onOpen={(e) => setOpen(e)}
                      acconts={field.value.account_auths.map((e) => e.account)}
                      keys={field.value.key_auths.map((e) => e.key)}
                    >
                      <Button variant="ghost" size="sm">
                        <PlusCircle className="h-5 w-5 cursor-pointer" />
                      </Button>
                    </AddAuthorityDialog>
                  )}
                />
              ) : null}
            </div>
            <FormField
              control={controller}
              name={`${id}.key_auths`}
              render={({ field }) => (
                <>
                  {field.value.map((_, index) => (
                    <Fragment key={index}>
                      <AuthoritiesGroupItem
                        width={width}
                        threshold={field.value[index].threshold}
                        label={field.value[index].key}
                        type="KEY"
                        editMode={editMode}
                        onUpdateThreshold={(e) => setValue(`${id}.key_auths[${index}].threshold`, e)}
                        onUpdateEntry={(e) => setValue(`${id}.key_auths[${index}].key`, e.toString())}
                        onDelete={() => {
                          setValue(
                            `${id}.key_auths`,
                            field.value.filter((e) => e.key !== field.value[index].key)
                          );
                        }}
                      />

                      <Separator className="col-span-4 bg-foreground" />
                    </Fragment>
                  ))}
                </>
              )}
            />
            <FormField
              control={controller}
              name={`${id}.account_auths`}
              render={({ field }) => (
                <>
                  {field.value.map((_, index) => (
                    <Fragment key={index}>
                      <AuthoritiesGroupItem
                        width={width}
                        threshold={field.value[index].threshold}
                        label={field.value[index].account}
                        type="USER"
                        editMode={editMode}
                        onUpdateThreshold={(e) => setValue(`${id}.account_auths[${index}].threshold`, e)}
                        onUpdateEntry={(e) => setValue(`${id}.account_auths[${index}].account`, e)}
                        onDelete={() => {
                          setValue(
                            `${id}.account_auths`,
                            field.value.filter((e) => e.account !== field.value[index].account)
                          );
                        }}
                      />
                      <Separator className="col-span-4 bg-foreground" />
                    </Fragment>
                  ))}
                </>
              )}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default AuthoritesGroup;
