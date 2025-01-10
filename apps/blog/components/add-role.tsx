import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useSetRoleMutation } from './hooks/use-set-role-mutations';
import { handleError } from '@ui/lib/utils';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { CircleSpinner } from 'react-spinners-kit';

type Role = {
  name: string;
  label: string;
  description: string;
  value: number;
};

type User = { value: number; role: string; name: string; title: string };

const AddRole = ({
  children,
  user,
  community,
  targetedUser
}: {
  children: ReactNode;
  user: User;
  community: string;
  targetedUser?: User;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(targetedUser ? targetedUser.role : 'member');
  const [userFromList, setUserFromList] = useState(targetedUser?.name ?? '');
  const { t } = useTranslation('common_blog');
  const setRoleMutation = useSetRoleMutation();

  const setRole = async () => {
    try {
      await setRoleMutation.mutateAsync({
        community,
        username: userFromList,
        role: selectedRole as EAvailableCommunityRoles
      });
    } catch (error) {
      handleError(error, {
        method: 'setRole',
        params: { community, username: userFromList, role: selectedRole as EAvailableCommunityRoles }
      });
    } finally {
      setOpen(false);
    }
  };

  const roles: Role[] = [
    {
      name: 'owner',
      label: t('communities.owner'),
      description: t('communities.assign_admins'),
      value: 6
    },
    {
      name: 'admin',
      label: t('communities.admin'),
      description: t('communities.edit_settings_assign_mods'),
      value: 5
    },
    {
      name: 'mod',
      label: t('communities.moderator'),
      description: t('communities.mute_pin_set_user_titles'),
      value: 4
    },
    {
      name: 'member',
      label: t('communities.member'),
      description: t('communities.listed_on_leadership_team'),
      value: 3
    },
    {
      name: 'guest',
      label: t('communities.guest'),
      description: t('communities.default_can_post_and_comment'),
      value: 2
    },
    {
      name: 'muted',
      label: t('communities.muted'),
      description: t('communities.new_posts_automaticly_muted'),
      value: 1
    }
  ];

  return (
    <AlertDialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex w-full items-center justify-between">
            <AlertDialogTitle>{t('communities.add_user_role')}</AlertDialogTitle>

            <AlertDialogCancel disabled={setRoleMutation.isLoading}>X</AlertDialogCancel>
          </div>
          <AlertDialogDescription>
            {t('communities.set_the_role_of_a_user_in_this_community')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div>
          <span>{t('communities.username')}</span>
          <Input
            disabled={!!targetedUser}
            value={userFromList}
            onChange={(e) => setUserFromList(e.target.value)}
          />
        </div>
        <div>
          <span>{t('communities.role')}</span>
          <Select value={selectedRole} onValueChange={(e) => setSelectedRole(e)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) =>
                role.value < user.value ? (
                  <SelectItem key={role.name} value={role.name}>
                    {role.label}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={setRole}
          variant="redHover"
          className="w-fit justify-self-end"
          disabled={setRoleMutation.isLoading}
        >
          {setRoleMutation.isLoading ? (
            <CircleSpinner loading={setRoleMutation.isLoading} size={18} color="#dc2626" />
          ) : (
            t('communities.save')
          )}
        </Button>
        <h1>{t('communities.role_permissions')}</h1>
        <div>
          {roles.map((role) => (
            <div key={role.name}>
              <span className="font-bold">{role.label}</span>
              {` - ${role.description}`}
            </div>
          ))}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AddRole;
