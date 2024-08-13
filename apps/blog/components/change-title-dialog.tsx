import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Separator
} from '@ui/components';
import { Pencil } from 'lucide-react';

const ChangeTitleDialog = ({
  moderateEnabled,
  userOnList
}: {
  moderateEnabled: Boolean;
  userOnList: string;
}) => {
  return moderateEnabled ? (
    <Dialog>
      <DialogTrigger>
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Title for @{userOnList}</DialogTitle>
          <Separator />
          <div>
            Title
            <Input />
          </div>
          <Button variant="redHover" className="w-fit justify-self-end">
            Save
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ) : null;
};

export default ChangeTitleDialog;
