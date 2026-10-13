import { Icons } from '@ui/components/icons';
import { Input } from '@ui/components/input';
import { useTranslation } from '@/blog/i18n/client';

interface ItemProps {
  onChangeBeneficiary: (weight: string, account: string) => void;
  beneficiary: { weight: string; account: string };
  position: number;
}
export function Beneficiary({ onChangeBeneficiary, beneficiary, position }: ItemProps) {
  const { t } = useTranslation('common_blog');
  return (
    <li className="flex items-center gap-5">
      <Input
        type="number"
        min={0}
        max={100}
        value={beneficiary.weight}
        className="w-16"
        aria-label={t('submit_page.advanced_settings_dialog.beneficiary_share_label', { num: position })}
        onChange={(e) => onChangeBeneficiary(e.target.value, beneficiary.account)}
        data-testid="beneficiary-value"
      />
      <div className="relative col-span-3">
        <Input
          value={beneficiary.account}
          className="block w-full px-3 py-2.5 pl-11"
          aria-label={t('submit_page.advanced_settings_dialog.beneficiary_account_label', { num: position })}
          onChange={(e) => onChangeBeneficiary(beneficiary.weight, e.target.value)}
          data-testid="beneficiary-name"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icons.atSign className="h-5 w-5" />
        </div>
      </div>
    </li>
  );
}
