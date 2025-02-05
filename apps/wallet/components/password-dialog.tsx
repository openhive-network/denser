import {
  Dialog,
  DialogTrigger,
  Button,
  DialogContent,
  DialogHeader,
  DialogDescription,
  Input,
  DialogFooter,
  Label
} from '@ui/components';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

interface PasswordDialogProps {
  onReveal: (password: string) => void;
  keysUploaded: boolean;
}

const PasswordDialog = ({ onReveal, keysUploaded }: PasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common_wallet');

  return keysUploaded ? (
    <Button onClick={() => onReveal('password')} className="absolute right-0 mt-0 h-full rounded-l-none p-2">
      {t('permissions.reveal')}
    </Button>
  ) : (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="absolute right-0 mt-0 h-full rounded-l-none p-2">{t('permissions.reveal')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogDescription>Enter your master password to reveal the private key.</DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="password">Master password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              onReveal(password);
              setOpen(false);
            }}
            type="submit"
          >
            {t('permissions.reveal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordDialog;
