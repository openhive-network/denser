import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label
} from '@ui/components';
import { useState } from 'react';
import { useDelegateMutation } from './hooks/use-delegate-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import { toast } from '@ui/components/hooks/use-toast';
import { getAsset } from '@transaction/lib/utils';

const RevokeDialog = ({ delegator, delegatee }: { delegator: string; delegatee: string }) => {
  const [open, setOpen] = useState(false);
  const delegateMutation = useDelegateMutation();
  const onRevoke = async () => {
    delegateMutation.mutate({
      delegator: delegator,
      delegatee: delegatee,
      hp: await getAsset('0', 'HIVE')
    });
    delegateMutation.isError &&
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke delegation'
      });
    delegateMutation.isSuccess && setOpen(false);
  };
  const loading = delegateMutation.isLoading;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outlineRed">Revoke</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delegate Vesting Shares</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Delegator</Label>
            <Input disabled value={delegator} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Delegatee</Label>
            <Input disabled value={delegatee} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">HIVE</Label>
            <Input disabled value={0} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="redHover" className="px-6" onClick={onRevoke} disabled={loading}>
            {loading ? <CircleSpinner loading={loading} size={18} color="#dc2626" /> : 'Ok'}
          </Button>
          <div className="flex-grow" />
          <Button variant="link" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevokeDialog;
