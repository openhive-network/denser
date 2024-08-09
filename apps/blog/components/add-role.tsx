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

const roles = [
  {
    name: 'owner',
    label: 'Owner',
    description: 'assign admins',
    value: 6
  },
  {
    name: 'admin',
    label: 'Admin',
    description: 'edit settings, assign mods',
    value: 5
  },
  {
    name: 'mod',
    label: 'Moderator',
    description: 'mute, pinm set user titles',
    value: 4
  },
  {
    name: 'member',
    label: 'Member',
    description: 'listed on leadership team',
    value: 3
  },
  {
    name: 'guest',
    label: 'Guest',
    description: 'default; can post and comment',
    value: 2
  },
  {
    name: 'muted',
    label: 'Muted',
    description: 'new posts automaticly muted',
    value: 1
  }
];
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
  function onSave() {
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User Role</DialogTitle>
          <DialogDescription>Set the role of a user in this community.</DialogDescription>
        </DialogHeader>

        <div>
          <span>Username</span>
          <Input />
        </div>
        <div>
          <span>Role</span>
          <Select value={selectedRole} onValueChange={(e) => setSelectedRole(e)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((e) =>
                e.value < user.value ? (
                  <SelectItem key={e.name} value={e.name}>
                    {e.label}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onSave} variant="redHover" className="w-fit justify-self-end">
          Save
        </Button>
        <h1>Role Permissions</h1>
        <div>
          {roles.map((e) => (
            <div key={e.name}>
              <span className="font-bold">{e.name}</span>
              {` - ${e.description}`}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRole;
