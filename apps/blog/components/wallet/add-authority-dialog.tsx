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
import { FC, useState } from 'react';
import NumberInput from './number-input';
import { LevelAuthority } from '@transaction/lib/hive';

const AddAuthorityDialog: FC<{
  level: Exclude<LevelAuthority, 'memo'>;
  authorityList: string[];
  onAddAuthority: (authority: { keyOrAccount: string; thresholdWeight: number }) => void;
  disabled: boolean;
}> = ({ level, authorityList, onAddAuthority, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('common_blog');
  const [newAuthority, setNewAuthority] = useState<{ keyOrAccount: string; thresholdWeight: number }>({
    keyOrAccount: '',
    thresholdWeight: 1
  });

  const isInputAlreadyExist = authorityList.includes(newAuthority.keyOrAccount);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2" disabled={disabled}>
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
              {t('authorities_page.key_or_account')}
            </Label>
            <Input
              id="name"
              className="col-span-3"
              value={newAuthority.keyOrAccount}
              onChange={(e) => setNewAuthority((prev) => ({ ...prev, keyOrAccount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="threshold" className="text-right">
              {t('authorities_page.weight')}
            </Label>
            <NumberInput
              id="threshold"
              value={newAuthority.thresholdWeight}
              onChange={(value) => setNewAuthority((prev) => ({ ...prev, thresholdWeight: Number(value) }))}
              className="col-span-3 w-full self-center justify-self-center bg-white/10 p-0 px-3"
            />
          </div>
        </div>
        <DialogFooter>
          {isInputAlreadyExist ? (
            <div className="flex items-center text-sm text-red-500">
              {t('authorities_page.account_exists_error')}
            </div>
          ) : null}
          <Button
            disabled={isInputAlreadyExist || !newAuthority.keyOrAccount}
            onClick={() => {
              setIsOpen(false);
              setNewAuthority({ keyOrAccount: '', thresholdWeight: 1 });
              onAddAuthority(newAuthority);
            }}
          >
            {t('authorities_page.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAuthorityDialog;
