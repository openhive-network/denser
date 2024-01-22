import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { LoginPanel } from '@smart-signer/components/login-panel';
import { useTranslation } from 'next-i18next';

function DialogLogin({ children }: { children: any }) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog">
        <LoginPanel />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
