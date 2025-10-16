'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Roles, rolesLevels } from './lib/utils';
import { useTranslation } from 'next-i18next';

const RolesSelect = ({
  loggedUserLevel,
  value,
  onValueChange,
  disabled
}: {
  loggedUserLevel: number;
  value: Roles;
  onValueChange: (value: Roles) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Select value={value} onValueChange={(e: Roles) => onValueChange(e)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rolesLevels.map((role) =>
          role.value < loggedUserLevel ? (
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
