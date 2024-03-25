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
import { useTranslation } from 'next-i18next';

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
  const { t } = useTranslation('common_blog');
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
      return acc + Number(beneficiary.percent);
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
      title: t('submit_page.advanced_settings_dialog.changes_saved'),
      variant: 'success'
    });
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-full overflow-scroll sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t('submit_page.advanced_settings_dialog.advanced_settings')}
          </DialogTitle>
          <Separator />
        </DialogHeader>
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">
              {t('submit_page.advanced_settings_dialog.maximum_accepted_payout')}
            </span>
            <span>{t('submit_page.advanced_settings_dialog.value_of_the_maximum')}</span>
            <div className="flex flex-col gap-1">
              <Select
                onValueChange={(e: 'noLimit' | 'decline' | 'custom') => handleMaxPayout(e)}
                defaultValue={maxPayout}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noLimit">
                    {t('submit_page.advanced_settings_dialog.no_limit')}
                  </SelectItem>
                  <SelectItem value="decline">
                    {t('submit_page.advanced_settings_dialog.decline_payout')}
                  </SelectItem>
                  <SelectItem value="custom">
                    {t('submit_page.advanced_settings_dialog.custom_value')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {maxPayout === 'custom' ? (
                <>
                  <Input type="number" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
                  {Number(customValue) < 0 ? (
                    <div className="p-2 text-red-600">
                      {t('submit_page.advanced_settings_dialog.cannot_be_less_than')}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">
              {t('submit_page.advanced_settings_dialog.author_rewards')}
            </span>
            <span>{t('submit_page.advanced_settings_dialog.what_type_of_tokens')}</span>
            <Select defaultValue={rewards} onValueChange={(e) => setRewards(e)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50%">{'50% HBD / 50% HP'}</SelectItem>
                <SelectItem value="100%">{t('submit_page.advanced_settings_dialog.power_up')}</SelectItem>
              </SelectContent>
            </Select>
            <span>{t('submit_page.advanced_settings_dialog.default')}</span>
            <Link href={`/@${username}/settings`} className="text-red-500">
              {t('submit_page.advanced_settings_dialog.update')}
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
                    {t('submit_page.advanced_settings_dialog.delete')}
                  </Button>
                </div>
              ))}
            </ul>
            {splitRewards < 0 ? (
              <div className="p-2 text-red-600">{t('submit_page.advanced_settings_dialog.your_percent')}</div>
            ) : null}
            {hasDuplicateUsernames ? (
              <div className="p-2 text-red-600">
                {t('submit_page.advanced_settings_dialog.beneficiaries_cannot')}
              </div>
            ) : null}
            {beneficiariesNames ? (
              <div className="p-2 text-red-600">{t('submit_page.advanced_settings_dialog.account_name')}</div>
            ) : null}
            {beneficiaries.length < 8 ? (
              <Button
                variant="link"
                className="h-fit w-fit px-0 py-1 text-xs text-red-500"
                onClick={handleAddAccount}
              >
                {t('submit_page.advanced_settings_dialog.add_account')}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">
              {t('submit_page.advanced_settings_dialog.post_templates')}
            </span>
            <span>{t('submit_page.advanced_settings_dialog.manage_your_post_templates')}</span>
            <div className="flex flex-col gap-1">
              <Select defaultValue={selectTemplate} onValueChange={(e) => handleTamplates(e)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('submit_page.advanced_settings_dialog.choose_a_template_to_load')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {t('submit_page.advanced_settings_dialog.choose_a_template_to_load')}
                  </SelectItem>
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
                placeholder={t('submit_page.advanced_settings_dialog.name_of_a_new_template')}
                value={templateTitle}
                onChange={(e) => handleTemplateTitle(e.target.value)}
              />
              {isTemplateStored ? (
                <div className="p-2 text-red-600">
                  {t('submit_page.advanced_settings_dialog.template_name_is_taken')}
                </div>
              ) : null}
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
            {t('submit_page.advanced_settings_dialog.save')}
          </Button>
          {selectTemplate !== '' ? (
            <Button variant="redHover" onClick={() => deleteTemplate(selectTemplate)} className="mb-2">
              {t('submit_page.advanced_settings_dialog.delete_template')}
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
