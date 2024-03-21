import { Input, Separator } from '@ui/components';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@ui/components/dialog';
import { ReactNode, useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hive/ui/components/select';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';

type AccountFormValues = {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
  beneficiaries: {
    username: string;
    percent: string;
  }[];
  maxAcceptedPayout: number | null;
  payoutType: string;
};

export function AdvancedSettingsPostForm({
  children,
  username,
  onChangeStore,
  data
}: {
  children: ReactNode;
  username: string;
  onChangeStore: (data: AccountFormValues) => void;
  data: AccountFormValues;
}) {
  const [rewards, setRewards] = useState('50%');
  const [beneficiaries, setBeneficiaries] = useState<{ percent: string; username: string }[]>([]);
  const [splitRewards, setSplitRewards] = useState(100);
  const [customPayout, setCustomPayout] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [template, setTemplate] = useState('');
  const [storedTemplate, storeTemplate] = useLocalStorage<any>(template, '');
  const handleAddAccount = () => {
    setBeneficiaries((prev) => [...prev, { percent: '0', username: '' }]);
  };
  useEffect(() => {
    const combinedPercentage = beneficiaries.reduce<number>((acc, beneficier) => {
      return acc + +beneficier.percent;
    }, 0);
    setSplitRewards(100 - combinedPercentage);
  }, [JSON.stringify(beneficiaries)]);

  const handleDeleteItem = (index: number) => {
    setBeneficiaries((prev) => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleEditBeneficiary = (index: number, percent: string, username: string) => {
    setBeneficiaries((prev) => {
      const updated = prev.map((beneficiary, beneficierIndex) =>
        index !== beneficierIndex ? beneficiary : { percent, username }
      );
      const combinedPercentage = updated.reduce<number>((acc, beneficier) => {
        return acc + Number(beneficier.percent);
      }, 0);
      setSplitRewards(100 - combinedPercentage);
      return updated;
    });
  };

  function handlerMaxPayout(e: string) {
    switch (e) {
      case 'noLimit':
        setRewards('50%');
        setCustomPayout(false);
        break;
      case 'decline':
        setRewards('0%');
        setCustomPayout(false);
        break;
      case 'custom':
        setRewards((prev) => (prev === '0' || '50%' ? '50%' : '100%'));
        setCustomPayout(true);
        break;
    }
  }
  function onSave() {
    onChangeStore({
      ...data,
      beneficiaries: beneficiaries,
      maxAcceptedPayout: customPayout || customValue === '0' ? Number(customValue) : null,
      payoutType: rewards
    });
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-full overflow-scroll sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Advanced settings</DialogTitle>
          <Separator />
        </DialogHeader>
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Maximum Accepted Payout</span>
            <span>HBD value of the maximum payout this post will receive.</span>
            <div className="flex flex-col gap-1">
              <Select onValueChange={(e) => handlerMaxPayout(e)} defaultValue="noLimit">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noLimit">No limit</SelectItem>
                  <SelectItem value="decline">Decline Payout</SelectItem>
                  <SelectItem value="custom">Custom value</SelectItem>
                </SelectContent>
              </Select>
              {customPayout ? (
                <Input type="number" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Author rewards</span>
            <span>What type of tokens do you want as rewards from this post?</span>
            <Select defaultValue={rewards} onValueChange={(e) => setRewards(e)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                <SelectItem value="100%">Power up 100%</SelectItem>
              </SelectContent>
            </Select>
            <span>Default: {'50% HBD / 50% HP'}</span>
            <Link href={`/@${username}/settings`} className="text-red-500">
              Update
            </Link>
          </div>
          <div>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-5">
                <Input value={splitRewards + '%'} disabled className="w-16" />
                <div className="relative col-span-3">
                  <Input disabled value={'username'} className="block w-full px-3 py-2.5 pl-11" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </li>
              {beneficiaries.map((item, index) => (
                <div className="flex" key={index}>
                  <Item
                    onChangeBeneficiary={(percent, username) =>
                      handleEditBeneficiary(index, percent, username)
                    }
                    beneficiary={item}
                  />
                  <Button
                    variant="link"
                    size="xs"
                    className="text-red-500"
                    onClick={() => handleDeleteItem(index)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </ul>

            {beneficiaries.length < 8 ? (
              <Button
                variant="link"
                className="h-fit w-fit px-0 py-1 text-xs text-red-500"
                onClick={handleAddAccount}
              >
                Add Account
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Post templates</span>
            <span>Manage your post templates, other settings here will also be saved/loaded.</span>
            <div className="flex flex-col gap-1">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Name of a new template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" variant="redHover" onClick={() => onSave()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ItemProps {
  onChangeBeneficiary: (percent: string, username: string) => void;
  beneficiary: { percent: string; username: string };
}
function Item({ onChangeBeneficiary, beneficiary }: ItemProps) {
  return (
    <li className="flex items-center gap-5">
      <Input
        type="number"
        value={beneficiary.percent}
        className="w-16"
        onChange={(e) => onChangeBeneficiary(e.target.value, beneficiary.username)}
      />
      <div className="relative col-span-3">
        <Input
          value={beneficiary.username}
          className="block w-full px-3 py-2.5 pl-11"
          onChange={(e) => onChangeBeneficiary(beneficiary.percent, e.target.value)}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.atSign className="h-5 w-5" />
        </div>
      </div>
    </li>
  );
}
