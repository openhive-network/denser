import React, { Dispatch, FC, Fragment, SetStateAction, useState } from 'react';
import { Button } from '@ui/components/button';
import { PlusCircle, Trash } from 'lucide-react';
import { Input, Separator } from '@ui/components';
import AuthoritiesGroupItem, { Item } from './authorities-group-item';
import NumberInput from './number-input';
import { AuthoritiesProps } from '../pages/[param]/authorities';
import AddAuthorityDialog from './add-authority-dialog';

type GroupProps = {
  id: string;
  label: string;
  threshold: number;
  users: Item[];
  keys: Item[];
  handlerUpdateData: Dispatch<SetStateAction<AuthoritiesProps>>;
};

const AuthoritesGroup: FC<GroupProps> = ({ id, threshold, label, users, keys, handlerUpdateData }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="container">
      <div className="flex w-full items-center justify-between">
        <h2 className="font-bold">{label}</h2>
        <AddAuthorityDialog onAdd={handlerUpdateData} id={id} open={open} onOpen={(e) => setOpen(e)}>
          <Button variant="ghost" size="sm">
            <PlusCircle className="h-5 w-5 cursor-pointer" />
          </Button>
        </AddAuthorityDialog>
      </div>
      <div className="grid w-full grid-cols-[max-content_1fr_1fr_max-content] gap-1">
        {keys.map((key) => (
          <Fragment key={key.label}>
            <AuthoritiesGroupItem
              deleteDisabled={keys.length === 1}
              key={key.id}
              {...key}
              onUpdate={(e) =>
                id === 'posting'
                  ? handlerUpdateData((prev) => ({
                      ...prev,
                      posting: {
                        ...prev.posting,
                        key_auths: { ...prev.posting.key_auths, [key.label]: e }
                      }
                    }))
                  : id === 'active'
                    ? handlerUpdateData((prev) => ({
                        ...prev,
                        active: {
                          ...prev.active,
                          key_auths: { ...prev.active.key_auths, [key.label]: e }
                        }
                      }))
                    : handlerUpdateData((prev) => ({
                        ...prev,
                        owner: {
                          ...prev.owner,
                          key_auths: { ...prev.owner.key_auths, [key.label]: e }
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
              key={user.id}
              {...user}
              onUpdate={(e) =>
                id === 'posting'
                  ? handlerUpdateData((prev) => ({
                      ...prev,
                      posting: {
                        ...prev.posting,
                        account_auths: { ...prev.posting.account_auths, [user.label]: e }
                      }
                    }))
                  : id === 'active'
                    ? handlerUpdateData((prev) => ({
                        ...prev,
                        active: {
                          ...prev.active,
                          account_auths: { ...prev.active.account_auths, [user.label]: e }
                        }
                      }))
                    : handlerUpdateData((prev) => ({
                        ...prev,
                        owner: {
                          ...prev.owner,
                          account_auths: { ...prev.owner.account_auths, [user.label]: e }
                        }
                      }))
              }
              onDelete={() =>
                id === 'posting'
                  ? handlerUpdateData((prev) => ({
                      ...prev,
                      posting: {
                        ...prev.posting,
                        account_auths: prev.posting.account_auths.filter(([label]) => label !== user.label)
                      }
                    }))
                  : id === 'active'
                    ? handlerUpdateData((prev) => ({
                        ...prev,
                        active: {
                          ...prev.active,
                          account_auths: prev.active.account_auths.filter(([label]) => label !== user.label)
                        }
                      }))
                    : handlerUpdateData((prev) => ({
                        ...prev,
                        owner: {
                          ...prev.owner,
                          account_auths: prev.owner.account_auths.filter(([label]) => label !== user.label)
                        }
                      }))
              }
            />
            <Separator className="col-span-4 bg-foreground" />
          </Fragment>
        ))}
        <div className="col-span-4 grid grid-cols-subgrid pl-2 text-xs hover:bg-foreground/20 sm:text-base">
          <div className="h-5 w-5" />
          <span className="font-medium">Threshold:</span>
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
          <div className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default AuthoritesGroup;
