import { Icons } from '@ui/components/icons';
import { Input } from '@ui/components/input';

interface ItemProps {
  onChangeBeneficiary: (weight: string, account: string) => void;
  beneficiary: { weight: string; account: string };
}
export function Beneficiary({ onChangeBeneficiary, beneficiary }: ItemProps) {
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
