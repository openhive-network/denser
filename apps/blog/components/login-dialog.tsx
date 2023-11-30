import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';

export default function LoginDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      {' '}
      <DialogTrigger asChild>
        <div>{children}</div>
      </DialogTrigger>
      <DialogContent className="p-0">
        <iframe src="http://localhost:3000/login" height="550px" width="510px"></iframe>
      </DialogContent>
    </Dialog>
  );
}
