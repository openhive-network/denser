import { Button, Input, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@ui/components';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useSetRoleMutation } from '../../components/hooks/use-set-role-mutations';
import { handleError } from '@ui/lib/handle-error';
import { EAvailableCommunityRoles } from '@hiveio/wax';
import { CircleSpinner } from 'react-spinners-kit';
import { User } from './lib/utils';
import RolesSelect from './roles-select';

const AddRole = ({ user, community }: { user: User; community: string }) => {
  const [open, setOpen] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [userFromList, setUserFromList] = useState('');
  const { t } = useTranslation('common_blog');
  const setRoleMutation = useSetRoleMutation();

  const setRole = async () => {
    try {
      await setRoleMutation.mutateAsync({
        community,
        username: userFromList,
        role: selectedRole as EAvailableCommunityRoles
      });
    } catch (error) {
      handleError(error, {
        method: 'setRole',
        params: { community, username: userFromList, role: selectedRole as EAvailableCommunityRoles }
      });
    } finally {
      setOpen('');
      setUserFromList('');
      setSelectedRole('member');
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
              <Input value={userFromList} onChange={(e) => setUserFromList(e.target.value)} />
            </div>
            <div>
              <span>{t('communities.role')}</span>
              <RolesSelect userLevel={user.value} value={selectedRole} onValueChange={setSelectedRole} />
            </div>
            <Button
              onClick={setRole}
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
