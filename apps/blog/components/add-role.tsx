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
    name: 'Owner',
    description: 'assign admins'
  },
  {
    name: 'Admin',
    description: 'edit settings, assign mods'
  },
  {
    name: 'Moderator',
    description: 'mute, pinm set user titles'
  },
  {
    name: 'Member',
    description: 'listed on leadership team'
  },
  {
    name: 'Guest',
    description: 'default; can post and comment'
  },
  {
    name: 'Muted',
    description: 'new posts automaticly muted'
  }
];

const AddRole = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  function onSave() {
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
      <DialogTrigger>{children}</DialogTrigger>
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
          <Select>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onSave} variant="redHover" className="w-fit justify-self-end">
          Save
        </Button>
        <h1>Role Permissions</h1>
        <div>
          {roles.map((e) => (
            <div>
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
