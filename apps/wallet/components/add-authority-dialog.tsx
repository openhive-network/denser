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
import { handleAuthorityError } from '../lib/utils';
import { toast } from '@ui/components/hooks/use-toast';
import NumberInput from './number-input';

const AddAuthorityDialog: FC<{
  level: LevelAuthority;
  authorityList: string[];
}> = ({ level, authorityList }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('common_wallet');
  const [newAuthority, setNewAuthority] = useState<{ keyOrAccount: string; thresholdWeight: number }>({
    keyOrAccount: '',
    thresholdWeight: 1
  });
  const addAuthorityMutation = useUpdateAuthorityMutation();
  const isInputAlreadyExist = authorityList.includes(newAuthority.keyOrAccount);

  const handleAddAuthority = () => {
    addAuthorityMutation.mutate(
      {
        level: level,
        action: {
          type: 'add',
          payload: newAuthority
        }
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        }
      }
    );
  };

  const isDisabled = addAuthorityMutation.isLoading;

  useEffect(() => {
    if (addAuthorityMutation.isError) {
      toast({
        title: handleAuthorityError(addAuthorityMutation),
        variant: 'destructive'
      });
    }
  }, [addAuthorityMutation.isLoading]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              disabled={isDisabled}
              id="name"
              className="col-span-3"
              value={newAuthority.keyOrAccount}
              onChange={(e) => setNewAuthority((prev) => ({ ...prev, keyOrAccount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              {t('authorities_page.threshold')}
            </Label>
            <NumberInput
              id="threshold"
              disabled={isDisabled}
              value={newAuthority.thresholdWeight}
              onChange={(value) => setNewAuthority((prev) => ({ ...prev, thresholdWeight: Number(value) }))}
              className="col-span-3 w-full self-center justify-self-center bg-white/10 p-0 px-3"
            />
          </div>
        </div>
        <DialogFooter>
          {isInputAlreadyExist ? (
            <div className="flex items-center text-sm text-red-500">
              Account or key already exists in the list of authority
            </div>
          ) : null}
          <Button onClick={handleAddAuthority} disabled={isDisabled || isInputAlreadyExist}>
            {isDisabled ? (
              <CircleSpinner loading={isDisabled} size={18} color="#dc2626" />
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
