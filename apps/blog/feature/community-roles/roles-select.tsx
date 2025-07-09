import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Roles, rolesLevels } from './lib/utils';
import { useTranslation } from 'next-i18next';

const RolesSelect = ({
  userLevel,
  value,
  onValueChange
}: {
  userLevel: number;
  value: Roles;
  onValueChange: (value: Roles) => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Select value={value} onValueChange={(e: Roles) => onValueChange(e)}>
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
