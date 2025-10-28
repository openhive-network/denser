'use client';

import { Button, Input, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@ui/components';
import { useTranslation } from '@/blog/i18n/client';
import { CircleSpinner } from 'react-spinners-kit';
import { Roles } from './lib/utils';
import RolesSelect from './roles-select';
import { useSetRoleMutation } from '@/blog/features/community-profile/hooks/use-set-role-mutations';
import { useState } from 'react';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { handleError } from '@ui/lib/handle-error';

const AddRole = ({ community, loggedUserLevel }: { loggedUserLevel: number; community: string }) => {
  const { t } = useTranslation('common_blog');
  const setRoleMutation = useSetRoleMutation();
  const [inputValue, setInputChange] = useState('');
  const [selectValue, setSelectValue] = useState<Roles>('member');
  const [open, setOpen] = useState('');

  const onUpdateRole = async () => {
    try {
      await setRoleMutation.mutateAsync({
        community,
        username: inputValue,
        role: selectValue as EAvailableCommunityRoles
      });
    } catch (error) {
      handleError(error, {
        method: 'setRole',
        params: { community, username: inputValue, role: selectValue as EAvailableCommunityRoles }
      });
    } finally {
      setOpen('');
      setInputChange('');
      setSelectValue('member');
    }
  };
  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={(value) => setOpen((prev) => (prev === 'role-item' ? '' : value))}
    >
      <AccordionItem value="role-item">
        <AccordionTrigger>{t('communities.add_user')}</AccordionTrigger>
        <AccordionContent>
          <div className="my-4 flex flex-col gap-6">
            <div>{t('communities.set_the_role_of_a_user_in_this_community')}</div>

            <div>
              <span>{t('communities.username')}</span>
              <Input value={inputValue} onChange={(e) => setInputChange(e.target.value)} />
            </div>
            <div>
              <span>{t('communities.role')}</span>
              <RolesSelect
                disabled={setRoleMutation.isLoading}
                loggedUserLevel={loggedUserLevel}
                value={selectValue}
                onValueChange={(e) => setSelectValue(e)}
              />
            </div>
            <Button
              onClick={onUpdateRole}
              variant="redHover"
              className="w-fit justify-self-end"
              disabled={setRoleMutation.isLoading}
            >
              {setRoleMutation.isLoading ? (
                <CircleSpinner loading={setRoleMutation.isLoading} size={18} color="#dc2626" />
              ) : (
                t('communities.save')
              )}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AddRole;
