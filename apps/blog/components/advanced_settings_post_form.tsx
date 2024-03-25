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
import { toast } from '@ui/components/hooks/use-toast';

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

type Template = {
  title: string;
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
  const [rewards, setRewards] = useState(data ? data.payoutType : '50%');
  const [splitRewards, setSplitRewards] = useState(100);
  const [templateTitle, setTemplateTitle] = useState('');
  const [maxPayout, setMaxPayout] = useState('noLimit');
  const [selectTemplate, setSelectTemplate] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<{ percent: string; username: string }[]>(
    data ? data.beneficiaries : []
  );
  const [customValue, setCustomValue] = useState(
    data.maxAcceptedPayout !== null ? data.maxAcceptedPayout : ''
  );
  const [storedTemplates, storeTemplates] = useLocalStorage<Template[]>(`hivePostTemplates-${username}`, []);
  const hasDuplicateUsernames = beneficiaries.reduce((acc, beneficiary, index, array) => {
    const isDuplicate = array.slice(index + 1).some((b) => b.username === beneficiary.username);
    return acc || isDuplicate;
  }, false);
  const isTemplateStored = storedTemplates.some((template) => template.title === templateTitle);
  const beneficiariesNames =
    beneficiaries.length !== 0 ? beneficiaries.some((beneficiary) => beneficiary.username.length < 3) : false;

  useEffect(() => {
    const combinedPercentage = beneficiaries.reduce<number>((acc, beneficiary) => {
      return acc + +beneficiary.percent;
    }, 0);
    setSplitRewards(100 - combinedPercentage);
  }, [JSON.stringify(beneficiaries)]);

  const handleAddAccount = () => {
    setBeneficiaries((prev) => [...prev, { percent: '0', username: '' }]);
  };

  const handleDeleteItem = (index: number) => {
    setBeneficiaries((prev) => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleEditBeneficiary = (index: number, percent: string, username: string) => {
    setBeneficiaries((prev) => {
      const updated = prev.map((beneficiary, beneficiaryIndex) =>
        index !== beneficiaryIndex ? beneficiary : { percent, username }
      );
      const combinedPercentage = updated.reduce<number>((acc, beneficiary) => {
        return acc + Number(beneficiary.percent);
      }, 0);
      setSplitRewards(100 - combinedPercentage);
      return updated;
    });
  };

  function deleteTemplate(templateName: string) {
    storeTemplates(storedTemplates.filter((e) => e.title !== templateName));
  }

  function handleMaxPayout(e: 'noLimit' | 'decline' | 'custom') {
    switch (e) {
      case 'noLimit':
        setRewards('50%');
        setMaxPayout(e);
        break;
      case 'decline':
        setRewards('0%');
        setMaxPayout(e);
        break;
      case 'custom':
        setRewards((prev) => (prev === '0' || '50%' ? '50%' : '100%'));
        setMaxPayout(e);
        break;
    }
  }

  function handleTamplates(e: string) {
    const template = storedTemplates.find((template) => template.title === e);
    setBeneficiaries(template ? template.beneficiaries : []);
    if (template?.maxAcceptedPayout === null) {
      handleMaxPayout('noLimit');
    }
    if (template?.maxAcceptedPayout === 0) {
      handleMaxPayout('decline');
    } else {
      handleMaxPayout('custom');
      setCustomValue(typeof template?.maxAcceptedPayout === 'number' ? template.maxAcceptedPayout : 0);
    }
    setRewards(template ? template.payoutType : '50%');
    setSelectTemplate(e);
  }
  function handleTemplateTitle(e: string) {
    setSelectTemplate('');
    setTemplateTitle(e);
  }
  function onSave() {
    if (selectTemplate !== '') {
      storeTemplates(
        storedTemplates.map((stored) =>
          stored.title !== selectTemplate
            ? stored
            : {
                title: selectTemplate,
                beneficiaries: beneficiaries,
                maxAcceptedPayout: customValue === '0' ? Number(customValue) : null,
                payoutType: rewards
              }
        )
      );
    }

    if (templateTitle !== '') {
      setTemplateTitle('');
      storeTemplates([
        ...storedTemplates,
        {
          title: templateTitle,
          beneficiaries: beneficiaries,
          maxAcceptedPayout: customValue === '0' ? Number(customValue) : null,
          payoutType: rewards
        }
      ]);
    }
    onChangeStore({
      ...data,
      beneficiaries: beneficiaries,
      maxAcceptedPayout: customValue === '0' ? Number(customValue) : null,
      payoutType: rewards
    });
    toast({
      title: 'Changes saved',
      variant: 'success'
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
              <Select
                onValueChange={(e: 'noLimit' | 'decline' | 'custom') => handleMaxPayout(e)}
                defaultValue={maxPayout}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noLimit">No limit</SelectItem>
                  <SelectItem value="decline">Decline Payout</SelectItem>
                  <SelectItem value="custom">Custom value</SelectItem>
                </SelectContent>
              </Select>
              {maxPayout === 'custom' ? (
                <>
                  <Input type="number" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
                  {Number(customValue) < 0 ? (
                    <div className="p-2 text-red-600">Cannot be less than 0</div>
                  ) : null}
                </>
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
                  <Input disabled value={username} className="block w-full px-3 py-2.5 pl-11" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icons.atSign className="h-5 w-5" />
                  </div>
                </div>
              </li>
              {beneficiaries.map((item, index) => (
                <div className="flex" key={index}>
                  <Beneficiary
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
            {splitRewards < 0 ? (
              <div className="p-2 text-red-600">Your percent cannot be less than 0</div>
            ) : null}
            {hasDuplicateUsernames ? (
              <div className="p-2 text-red-600">Beneficiaries cannot be repeated</div>
            ) : null}
            {beneficiariesNames ? (
              <div className="p-2 text-red-600">The account name should be longer</div>
            ) : null}
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
              <Select defaultValue={selectTemplate} onValueChange={(e) => handleTamplates(e)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Choose a template to load</SelectItem>
                  {storedTemplates
                    ? storedTemplates.map((e) => (
                        <SelectItem key={e.title} value={e.title}>
                          {e.title}
                        </SelectItem>
                      ))
                    : null}
                </SelectContent>
              </Select>
              <Input
                placeholder="Name of a new template"
                value={templateTitle}
                onChange={(e) => handleTemplateTitle(e.target.value)}
              />
              {isTemplateStored ? <div className="p-2 text-red-600">Template name is taken</div> : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            variant="redHover"
            onClick={() => onSave()}
            disabled={
              Number(customValue) < 0 ||
              splitRewards < 0 ||
              hasDuplicateUsernames ||
              isTemplateStored ||
              beneficiariesNames
            }
          >
            Save
          </Button>
          {selectTemplate !== '' ? (
            <Button variant="redHover" onClick={() => deleteTemplate(selectTemplate)} className="mb-2">
              Delete Template
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ItemProps {
  onChangeBeneficiary: (percent: string, username: string) => void;
  beneficiary: { percent: string; username: string };
}
function Beneficiary({ onChangeBeneficiary, beneficiary }: ItemProps) {
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
