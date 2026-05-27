'use client';

import { TableCell, TableRow } from '@ui/components/table';
import { Pen, Save, X } from 'lucide-react';
import { Roles, User } from './lib/utils';
import BasePathLink from '@/blog/components/base-path-link';
import { useSetRoleMutation } from '@/blog/features/community-profile/hooks/use-set-role-mutations';
import { useState } from 'react';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { handleError } from '@ui/lib/handle-error';
import clsx from 'clsx';
import RolesSelect from './roles-select';

const TableItem = ({
  community,
  item,
  loggedUserValue
}: {
  community: string;
  item: User;
  loggedUserValue: number;
}) => {
  const setRoleMutation = useSetRoleMutation();
  const [selectedRole, setSelectedRole] = useState<Roles>(item.role as Roles);
  const [editMode, setEditMode] = useState(false);

  const onUpdateRole = async () => {
    try {
      await setRoleMutation.mutateAsync({
        community,
        username: item.name,
        role: selectedRole as EAvailableCommunityRoles
      });
    } catch (error) {
      handleError(error, {
        method: 'setRole',
        params: { community, username: item.name, role: selectedRole as EAvailableCommunityRoles }
      });
    } finally {
      setEditMode(false);
    }
  };

  return (
    <TableRow key={item.name} data-testid="community-role-row" data-account={item.name}>
      <TableCell className="p-2">
        <BasePathLink
          href={`/@${item.name}`}
          className="text-destructive"
          data-testid="community-role-account"
        >
          @{item.name}
        </BasePathLink>
      </TableCell>
      <TableCell className="border-x-[1px] border-solid border-secondary p-2">
        {loggedUserValue >= 4 && item.value < loggedUserValue ? (
          <span className="flex items-center gap-2">
            {editMode ? (
              <>
                <div className="w-36">
                  <RolesSelect
                    disabled={setRoleMutation.isPending}
                    loggedUserLevel={loggedUserValue}
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                    testId="community-role-edit-select"
                  />
                </div>
                <button
                  onClick={onUpdateRole}
                  disabled={setRoleMutation.isPending}
                  data-testid="community-role-save-button"
                >
                  <Save className="h-4 w-4 text-green-500" />
                </button>
                <button
                  onClick={() => setEditMode((prev) => !prev)}
                  disabled={setRoleMutation.isPending}
                  data-testid="community-role-cancel-button"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </>
            ) : (
              <>
                <span
                  className={clsx('', {
                    'animate-pulse text-destructive': item.temprary
                  })}
                  data-testid="community-role-name"
                >
                  {item.role}
                </span>
                <button
                  onClick={() => setEditMode(true)}
                  className="text-destructive"
                  disabled={item.temprary}
                  data-testid="community-role-edit-button"
                >
                  <Pen className="h-4 w-4" />
                </button>
              </>
            )}
          </span>
        ) : (
          <span data-testid="community-role-name">{item.role}</span>
        )}
      </TableCell>

      <TableCell className="p-2" data-testid="community-role-title">
        {item.title}
      </TableCell>
    </TableRow>
  );
};
export default TableItem;
