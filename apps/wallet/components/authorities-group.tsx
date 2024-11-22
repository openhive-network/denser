import React, { Dispatch, FC, Fragment, SetStateAction, useLayoutEffect, useState } from 'react';
import { Button } from '@ui/components/button';
import { PlusCircle } from 'lucide-react';
import { Separator } from '@ui/components';
import AuthoritiesGroupItem, { Item } from './authorities-group-item';
import NumberInput from './number-input';
import { AuthoritiesProps } from '../pages/[param]/authorities';
import AddAuthorityDialog from './add-authority-dialog';
import useWindowSize from './hooks/use-window-size';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';

type GroupProps = {
  id: string;
  label: string;
  threshold: number;
  users: Item[];
  keys: Item[];
  handlerUpdateData: Dispatch<SetStateAction<AuthoritiesProps>>;
  editable: boolean;
};

const AuthoritesGroup: FC<GroupProps> = ({
  id,
  threshold,
  label,
  users,
  keys,
  handlerUpdateData,
  editable
}) => {
  const [open, setOpen] = useState(false);
  const { width } = useWindowSize();
  return (
    <div className="container">
      <AccordionItem value={label}>
        <AccordionTrigger>
          <h2 className="font-bold">{label}</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid w-full grid-cols-[max-content_1fr_1fr_max-content] gap-1">
            <div className="col-span-4 grid grid-cols-subgrid items-center pl-2 text-xs hover:bg-foreground/20 sm:text-base">
              <div className="size-5" />
              <span className="justify-self-end font-medium">Threshold:</span>
              {editable ? (
                <NumberInput
                  className="h-6 w-1/2"
                  value={threshold}
                  onChange={(e) =>
                    id === 'posting'
                      ? handlerUpdateData((prev) => ({
                          ...prev,
                          posting: {
                            ...prev.posting,
                            weight_threshold: Number(e)
                          }
                        }))
                      : id === 'active'
                        ? handlerUpdateData((prev) => ({
                            ...prev,
                            active: {
                              ...prev.active,
                              weight_threshold: Number(e)
                            }
                          }))
                        : handlerUpdateData((prev) => ({
                            ...prev,
                            owner: {
                              ...prev.owner,
                              weight_threshold: Number(e)
                            }
                          }))
                  }
                />
              ) : (
                <span>{threshold}</span>
              )}
              {editable ? (
                <AddAuthorityDialog onAdd={handlerUpdateData} id={id} open={open} onOpen={(e) => setOpen(e)}>
                  <Button variant="ghost" size="sm">
                    <PlusCircle className="h-5 w-5 cursor-pointer" />
                  </Button>
                </AddAuthorityDialog>
              ) : null}
            </div>
            {keys.map((key) => (
              <Fragment key={key.label}>
                <AuthoritiesGroupItem
                  width={width}
                  editable={editable}
                  deleteDisabled={keys.length === 1}
                  key={key.id}
                  {...key}
                  onUpdate={(e) =>
                    id === 'posting'
                      ? handlerUpdateData((prev) => ({
                          ...prev,
                          posting: {
                            ...prev.posting,
                            key_auths: prev.posting.key_auths.map((auth) =>
                              auth[0] === key.label ? [auth[0], e] : auth
                            )
                          }
                        }))
                      : id === 'active'
                        ? handlerUpdateData((prev) => ({
                            ...prev,
                            active: {
                              ...prev.active,
                              key_auths: prev.active.key_auths.map((auth) =>
                                auth[0] === key.label ? [auth[0], e] : auth
                              )
                            }
                          }))
                        : handlerUpdateData((prev) => ({
                            ...prev,
                            owner: {
                              ...prev.owner,
                              key_auths: prev.owner.key_auths.map((auth) =>
                                auth[0] === key.label ? [auth[0], e] : auth
                              )
                            }
                          }))
                  }
                  onDelete={() =>
                    id === 'posting'
                      ? handlerUpdateData((prev) => ({
                          ...prev,
                          posting: {
                            ...prev.posting,
                            key_auths: prev.posting.key_auths.filter(([label]) => label !== key.label)
                          }
                        }))
                      : id === 'active'
                        ? handlerUpdateData((prev) => ({
                            ...prev,
                            active: {
                              ...prev.active,
                              key_auths: prev.active.key_auths.filter(([label]) => label !== key.label)
                            }
                          }))
                        : handlerUpdateData((prev) => ({
                            ...prev,
                            owner: {
                              ...prev.owner,
                              key_auths: prev.owner.key_auths.filter(([label]) => label !== key.label)
                            }
                          }))
                  }
                />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}
            {users.map((user) => (
              <Fragment key={user.label}>
                <AuthoritiesGroupItem
                  editable={editable}
                  key={user.id}
                  {...user}
                  onUpdate={(e) =>
                    id === 'posting'
                      ? handlerUpdateData((prev) => ({
                          ...prev,
                          posting: {
                            ...prev.posting,
                            account_auths: prev.posting.account_auths.map((auth) =>
                              auth[0] === user.label ? [auth[0], e] : auth
                            )
                          }
                        }))
                      : id === 'active'
                        ? handlerUpdateData((prev) => ({
                            ...prev,
                            active: {
                              ...prev.active,
                              account_auths: prev.active.account_auths.map((auth) =>
                                auth[0] === user.label ? [auth[0], e] : auth
                              )
                            }
                          }))
                        : handlerUpdateData((prev) => ({
                            ...prev,
                            owner: {
                              ...prev.owner,
                              account_auths: prev.owner.account_auths.map((auth) =>
                                auth[0] === user.label ? [auth[0], e] : auth
                              )
                            }
                          }))
                  }
                  onDelete={() =>
                    id === 'posting'
                      ? handlerUpdateData((prev) => ({
                          ...prev,
                          posting: {
                            ...prev.posting,
                            account_auths: prev.posting.account_auths.filter(
                              ([label]) => label !== user.label
                            )
                          }
                        }))
                      : id === 'active'
                        ? handlerUpdateData((prev) => ({
                            ...prev,
                            active: {
                              ...prev.active,
                              account_auths: prev.active.account_auths.filter(
                                ([label]) => label !== user.label
                              )
                            }
                          }))
                        : handlerUpdateData((prev) => ({
                            ...prev,
                            owner: {
                              ...prev.owner,
                              account_auths: prev.owner.account_auths.filter(
                                ([label]) => label !== user.label
                              )
                            }
                          }))
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
