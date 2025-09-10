import { TableCell, TableRow } from '@ui/components/table';
import { Pen, Save, X } from 'lucide-react';
import { Roles, User } from './lib/utils';
import BasePathLink from '@/blog/components/base-path-link';
import RolesSelect from './roles-select';
import { useSetRoleMutation } from '@/blog/components/hooks/use-set-role-mutations';
import { useState } from 'react';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { handleError } from '@ui/lib/handle-error';
import clsx from 'clsx';

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
    <TableRow key={item.name}>
      <TableCell className="p-2">
        <BasePathLink href={`/@${item.name}`} className="text-destructive">
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
                    disabled={setRoleMutation.isLoading}
                    loggedUserLevel={loggedUserValue}
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  />
                </div>
                <button onClick={onUpdateRole} disabled={setRoleMutation.isLoading}>
                  <Save className="h-4 w-4 text-green-500" />
                </button>
                <button onClick={() => setEditMode((prev) => !prev)} disabled={setRoleMutation.isLoading}>
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </>
            ) : (
              <>
                <span
                  className={clsx('', {
                    'animate-pulse text-destructive': item.temprary
                  })}
                >
                  {item.role}
                </span>
                <button
                  onClick={() => setEditMode(true)}
                  className="text-destructive"
                  disabled={item.temprary}
                >
                  <Pen className="h-4 w-4" />
                </button>
              </>
            )}
          </span>
        ) : (
          <span>{item.role}</span>
        )}
      </TableCell>

      <TableCell className="p-2">{item.title}</TableCell>
    </TableRow>
  );
};
export default TableItem;
