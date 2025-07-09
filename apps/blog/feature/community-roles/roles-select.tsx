import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { rolesLevels } from './lib/utils';
import { useTranslation } from 'next-i18next';

const RolesSelect = ({
  userLevel,
  value,
  onValueChange
}: {
  userLevel: number;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Select value={value} onValueChange={(e) => onValueChange(e)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rolesLevels.map((role) =>
          role.value < userLevel ? (
            <SelectItem key={role.name} value={role.name}>
              {t(`communities.${role.name}`)}
            </SelectItem>
          ) : null
        )}
      </SelectContent>
    </Select>
  );
};
export default RolesSelect;
