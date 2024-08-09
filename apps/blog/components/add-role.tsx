import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'next-i18next';

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
  targetedUser
}: {
  children: ReactNode;
  user: User;
  targetedUser?: User;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(targetedUser ? targetedUser.role : 'member');
  const { t } = useTranslation('common_blog');

  const onSave = () => {
    setOpen(false);
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
    <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('communities.add_user_role')}</DialogTitle>
          <DialogDescription>{t('communities.set_the_role_of_a_user_in_this_community')}</DialogDescription>
        </DialogHeader>

        <div>
          <span>{t('communities.username')}</span>
          <Input />
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
        <Button onClick={onSave} variant="redHover" className="w-fit justify-self-end">
          {t('communities.save')}
        </Button>
        <h1>{t('communities.role_permissions')}</h1>
        <div>
          {roles.map((role) => (
            <div key={role.name}>
              <span className="font-bold">{role.name}</span>
              {` - ${role.description}`}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRole;
