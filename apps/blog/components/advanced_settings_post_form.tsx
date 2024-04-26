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
import { useLocalStorage } from 'usehooks-ts';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from 'next-i18next';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';

type AccountFormValues = {
  title: string;
  postArea: string;
  postSummary: string;
  tags: string;
  author: string;
  category: string;
  beneficiaries: {
    account: string;
    weight: string;
  }[];
  maxAcceptedPayout: number;
  payoutType: string;
};
type Template = AccountFormValues & {
  templateTitle: string;
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
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${username}`,
    DEFAULT_PREFERENCES
  );
  const [rewards, setRewards] = useState(data.payoutType);
  const [splitRewards, setSplitRewards] = useState(100);
  const [templateTitle, setTemplateTitle] = useState('');
  const [maxPayout, setMaxPayout] = useState(
    data.maxAcceptedPayout === 1000000 ? 'no_max' : data.maxAcceptedPayout === 0 ? '0' : 'custom'
  );
  const [selectTemplate, setSelectTemplate] = useState('/');
  const [beneficiaries, setBeneficiaries] = useState<{ weight: string; account: string }[]>(
    data.beneficiaries
  );
  const [customValue, setCustomValue] = useState(
    data.maxAcceptedPayout !== 1000000 ? data.maxAcceptedPayout : '100'
  );
  const [open, setOpen] = useState(false);
  const [storedTemplates, storeTemplates] = useLocalStorage<Template[]>(`hivePostTemplates-${username}`, []);
  const hasDuplicateUsernames = beneficiaries.reduce((acc, beneficiary, index, array) => {
    const isDuplicate = array.slice(index + 1).some((b) => b.account === beneficiary.account);
    return acc || isDuplicate;
  }, false);
  const beneficiariesNames =
    beneficiaries.length !== 0 ? beneficiaries.some((beneficiary) => beneficiary.account.length < 3) : false;
  const selfBeneficiary =
    beneficiaries.length !== 0
      ? beneficiaries.some((beneficiary) => beneficiary.account === username)
      : false;
  const smallWeight = beneficiaries.find((e) => Number(e.weight) <= 0);
  const isTemplateStored = storedTemplates.some((template) => template.templateTitle === templateTitle);
  const currentTemplate = storedTemplates.find((e) => e.templateTitle === selectTemplate);

  useEffect(() => {
    setRewards(data.payoutType);
    setMaxPayout(
      data.maxAcceptedPayout === 1000000 ? 'no_max' : data.maxAcceptedPayout === 0 ? '0' : 'custom'
    );
    setBeneficiaries(data.beneficiaries);
    setCustomValue(data.maxAcceptedPayout !== 1000000 ? data.maxAcceptedPayout : '100');
  }, [open]);

  useEffect(() => {
    const combinedPercentage = beneficiaries.reduce<number>((acc, beneficiary) => {
      return acc + Number(beneficiary.weight);
    }, 0);
    setSplitRewards(100 - combinedPercentage);
  }, [JSON.stringify(beneficiaries)]);

  const handleAddAccount = () => {
    setBeneficiaries((prev) => [...prev, { weight: '0', account: '' }]);
  };

  const handleDeleteItem = (index: number) => {
    setBeneficiaries((prev) => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleEditBeneficiary = (index: number, weight: string, account: string) => {
    setBeneficiaries((prev) => {
      const updated = prev.map((beneficiary, beneficiaryIndex) =>
        index !== beneficiaryIndex ? beneficiary : { weight, account }
      );
      const combinedPercentage = updated.reduce<number>((acc, beneficiary) => {
        return acc + Number(beneficiary.weight);
      }, 0);
      setSplitRewards(100 - combinedPercentage);
      return updated;
    });
  };

  function deleteTemplate(templateName: string) {
    storeTemplates(storedTemplates.filter((e) => e.templateTitle !== templateName));
    setSelectTemplate('/');
  }

  function handleTamplates(e: string) {
    const template = storedTemplates.find((template) => template.templateTitle === e);
    if (template) {
      setBeneficiaries(template.beneficiaries);
      setRewards(template.payoutType);
      if (template.maxAcceptedPayout === 1000000) {
        setMaxPayout('no_max');
      }
      if (template.maxAcceptedPayout === 0) {
        setMaxPayout('0');
      }
      if (Number(template.maxAcceptedPayout)) {
        setMaxPayout('custom');
        setCustomValue(Number(template.maxAcceptedPayout));
      }
    }
    setSelectTemplate(e);
  }
  function handleTemplateTitle(e: string) {
    setSelectTemplate('/');
    setTemplateTitle(e);
  }
  function maxAcceptedPayout() {
    switch (maxPayout) {
      case 'no_max':
        return 1000000;
      case '0':
        return 0;
      case 'custom':
        return customValue === '0' ? 1000000 : Number(customValue);
    }
    return 1000000;
  }
  function loadTemplate() {
    onChangeStore({
      title: currentTemplate?.title || '',
      postArea: currentTemplate?.postArea || '',
      postSummary: currentTemplate?.postSummary || '',
      tags: currentTemplate?.tags || '',
      author: currentTemplate?.author || '',
      category: currentTemplate?.category || '',
      beneficiaries: beneficiaries,
      maxAcceptedPayout: maxAcceptedPayout(),
      payoutType: rewards
    });
    setSelectTemplate('/');
    setOpen(false);
    toast({
      title: t('submit_page.advanced_settings_dialog.template_loaded'),
      variant: 'success'
    });
  }
  function onSave() {
    if (selectTemplate !== '/') {
      storeTemplates(
        storedTemplates.map((stored) =>
          stored.templateTitle !== selectTemplate
            ? stored
            : {
                title: data.title,
                postArea: data.postArea,
                postSummary: data.postSummary,
                tags: data.tags,
                author: data.author,
                category: data.category,
                templateTitle: selectTemplate,
                beneficiaries: beneficiaries,
                maxAcceptedPayout: maxAcceptedPayout(),
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
          title: data.title,
          postArea: data.postArea,
          postSummary: data.postSummary,
          tags: data.tags,
          author: data.author,
          category: data.category,
          templateTitle: templateTitle,
          beneficiaries: beneficiaries,
          maxAcceptedPayout: maxAcceptedPayout(),
          payoutType: rewards
        }
      ]);
    }
    onChangeStore({
      ...data,
      beneficiaries: beneficiaries,
      maxAcceptedPayout: maxAcceptedPayout(),
      payoutType: rewards
    });
    setSelectTemplate('/');
    setOpen(false);
    toast({
      title: t('submit_page.advanced_settings_dialog.changes_saved'),
      variant: 'success'
    });
  }

  function authorRewardsText(author_rewards: string): string {
    const def = '50% HBD / 50% HP';
    let text;
    switch (author_rewards) {
      case '0%':
        text = t('settings_page.decline_payout');
        break;
      case '50%':
        text = def;
        break;
      case '100%':
        text = t('settings_page.power_up');
        break;
      default:
        text = def;
    }
    return text;
  }

  return (
    <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
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
              <Select onValueChange={(e: '0' | 'no_max' | 'custom') => setMaxPayout(e)} value={maxPayout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_max">{t('submit_page.advanced_settings_dialog.no_limit')}</SelectItem>
                  <SelectItem value="0">
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
                  <div className="p-2 text-red-600">
                    {Number(customValue) < 0
                      ? t('submit_page.advanced_settings_dialog.cannot_be_less_than')
                      : Number(customValue) >= 1000000
                        ? t('submit_page.advanced_settings_dialog.cannot_be_more_than')
                        : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">
              {t('submit_page.advanced_settings_dialog.author_rewards')}
            </span>
            <span>{t('submit_page.advanced_settings_dialog.what_type_of_tokens')}</span>
            <Select
              value={rewards}
              onValueChange={(e: '50%' | '100%') => setRewards(e)}
              disabled={maxPayout === '0'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50%">{'50% HBD / 50% HP'}</SelectItem>
                <SelectItem value="100%">{t('submit_page.advanced_settings_dialog.power_up')}</SelectItem>
              </SelectContent>
            </Select>
            <span>
              {t('submit_page.advanced_settings_dialog.default')}
              {authorRewardsText(preferences.blog_rewards)}
            </span>
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
                    onChangeBeneficiary={(weight, account) => handleEditBeneficiary(index, weight, account)}
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
            <div className="p-2 text-red-600">
              {splitRewards < 0
                ? t('submit_page.advanced_settings_dialog.your_percent')
                : hasDuplicateUsernames
                  ? t('submit_page.advanced_settings_dialog.beneficiaries_cannot')
                  : beneficiariesNames
                    ? t('submit_page.advanced_settings_dialog.account_name')
                    : selfBeneficiary
                      ? t('submit_page.advanced_settings_dialog.beneficiary_cannot_be_self')
                      : smallWeight
                        ? t('submit_page.advanced_settings_dialog.beneficiary_percent_invalid')
                        : null}
            </div>
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
              <Select value={selectTemplate} onValueChange={(e) => handleTamplates(e)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('submit_page.advanced_settings_dialog.choose_a_template_to_load')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/">
                    {t('submit_page.advanced_settings_dialog.choose_a_template_to_load')}
                  </SelectItem>
                  {storedTemplates
                    ? storedTemplates.map((e) => (
                        <SelectItem key={e.templateTitle} value={e.templateTitle}>
                          {e.templateTitle}
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
              Number(customValue) >= 1000000 ||
              splitRewards < 0 ||
              hasDuplicateUsernames ||
              isTemplateStored ||
              beneficiariesNames ||
              selfBeneficiary ||
              Boolean(smallWeight)
            }
          >
            {t('submit_page.advanced_settings_dialog.save')}
          </Button>
          {currentTemplate ? (
            <Button variant="redHover" onClick={() => loadTemplate()}>
              {t('submit_page.advanced_settings_dialog.load')}
            </Button>
          ) : null}
          {selectTemplate !== '/' ? (
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
  onChangeBeneficiary: (weight: string, account: string) => void;
  beneficiary: { weight: string; account: string };
}
function Beneficiary({ onChangeBeneficiary, beneficiary }: ItemProps) {
  return (
    <li className="flex items-center gap-5">
      <Input
        type="number"
        value={beneficiary.weight}
        className="w-16"
        onChange={(e) => onChangeBeneficiary(e.target.value, beneficiary.account)}
      />
      <div className="relative col-span-3">
        <Input
          value={beneficiary.account}
          className="block w-full px-3 py-2.5 pl-11"
          onChange={(e) => onChangeBeneficiary(beneficiary.weight, e.target.value)}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.atSign className="h-5 w-5" />
        </div>
      </div>
    </li>
  );
}
