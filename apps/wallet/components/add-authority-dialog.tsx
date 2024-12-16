import {
  Dialog,
  DialogTrigger,
  Button,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  DialogFooter,
  Label
} from '@ui/components';
import { PlusCircle } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { FC, useEffect, useState } from 'react';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import { LevelAuthority } from '@transaction/index';
import { handlerError } from '../lib/utils';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/utils';

const AddAuthorityDialog: FC<{
  level: LevelAuthority;
}> = ({ level }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common_wallet');
  const [newItem, setNewItem] = useState<{ keyOrAccount: string; thresholdWeight: number }>({
    keyOrAccount: '',
    thresholdWeight: 1
  });
  const addAuthorityMutation = useUpdateAuthorityMutation();

  const onAdd = () => {
    addAuthorityMutation.mutate(
      {
        level: level,
        action: {
          type: 'add',
          payload: newItem
        }
      },
      {
        onSuccess: () => {
          setOpen(false);
        }
      }
    );
  };
  const disabled = addAuthorityMutation.isLoading;
  useEffect(() => {
    if (addAuthorityMutation.isError) {
      toast({
        title: handlerError(addAuthorityMutation),
        variant: 'destructive'
      });
    }
  }, [addAuthorityMutation.isLoading]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <PlusCircle className="h-5 w-5 cursor-pointer" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('authorities_page.add_item_title', { id: level })}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
            <Label htmlFor="name" className="text-right">
              Key or Account
            </Label>
            <Input
              disabled={disabled}
              id="name"
              className="col-span-3"
              value={newItem.keyOrAccount}
              onChange={(e) => setNewItem((prev) => ({ ...prev, keyOrAccount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              {t('authorities_page.threshold')}
            </Label>
            <Input
              disabled={disabled}
              value={newItem.thresholdWeight}
              type="number"
              onChange={(value) => {
                setNewItem({ ...newItem, thresholdWeight: Number(value.target.value) });
              }}
              className="col-span-3 w-full self-center justify-self-center bg-white/10 p-0 px-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onAdd} disabled={disabled}>
            {disabled ? (
              <CircleSpinner loading={disabled} size={18} color="#dc2626" />
            ) : (
              t('authorities_page.add')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorityDialog;
