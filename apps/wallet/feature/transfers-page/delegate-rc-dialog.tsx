import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  DialogFooter,
  Input,
  Label
} from '@ui/components';
import { useDelegateRCMutation } from './hooks/use-delegate-mutation';
import { useEffect, useState } from 'react';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';

const defaultForm = { toAccount: '', amount: '' };
const DelegateRCDialog = () => {
  const delegateMutation = useDelegateRCMutation();
  const [form, setForm] = useState(defaultForm);
  const [open, setOpen] = useState(false);

  const onDelegate = async () => {
    try {
      await delegateMutation.mutateAsync({
        toAccount: form.toAccount,
        amount: form.amount
      });
    } catch (error) {
      handleError(error, { method: 'delegate', params: { toAccount: form.toAccount, amount: form.amount } });
    }
  };
  useEffect(() => {
    if (delegateMutation.isSuccess) {
      setOpen(false);
      setForm(defaultForm);
    }
  }, [delegateMutation.isSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outlineRed">Delegate RC</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <div>
            <Label htmlFor="toAccount">To Account</Label>
            <Input
              disabled={delegateMutation.isLoading}
              id="toAccount"
              value={form.toAccount}
              onChange={(e) => setForm({ ...form, toAccount: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="amount">RC Amount</Label>
            <Input
              disabled={delegateMutation.isLoading}
              id="amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={delegateMutation.isLoading}>
            Cancel
          </Button>
          <Button variant="redHover" onClick={onDelegate} disabled={delegateMutation.isLoading}>
            {delegateMutation.isLoading ? (
              <span className="flex h-5 w-12 items-center justify-center">
                <CircleSpinner loading={delegateMutation.isLoading} size={18} color="#dc2626" />
              </span>
            ) : (
              'Delegate RC'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DelegateRCDialog;
