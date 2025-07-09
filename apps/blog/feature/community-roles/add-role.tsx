import { Button, Input, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@ui/components';
import { useTranslation } from 'next-i18next';
import { CircleSpinner } from 'react-spinners-kit';
import { Roles, User } from './lib/utils';
import RolesSelect from './roles-select';

const AddRole = ({
  user,
  onClick,
  isLoading,
  inputValue,
  selectValue,
  openValue,
  onInputChange,
  onSelectChange,
  onOpenValueChange
}: {
  user: User;
  onClick: () => void;
  isLoading: boolean;
  inputValue: string;
  selectValue: Roles;
  openValue: string;
  onInputChange: (value: string) => void;
  onSelectChange: (value: Roles) => void;
  onOpenValueChange: (value: string) => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <Accordion type="single" collapsible value={openValue} onValueChange={onOpenValueChange}>
      <AccordionItem value="role-item">
        <AccordionTrigger>{t('communities.add_user')}</AccordionTrigger>
        <AccordionContent>
          <div className="my-4 flex flex-col gap-6">
            <div>{t('communities.set_the_role_of_a_user_in_this_community')}</div>

            <div>
              <span>{t('communities.username')}</span>
              <Input value={inputValue} onChange={(e) => onInputChange(e.target.value)} />
            </div>
            <div>
              <span>{t('communities.role')}</span>
              <RolesSelect
                userLevel={user.value}
                value={selectValue}
                onValueChange={(e) => onSelectChange(e)}
              />
            </div>
            <Button
              onClick={onClick}
              variant="redHover"
              className="w-fit justify-self-end"
              disabled={isLoading}
            >
              {isLoading ? (
                <CircleSpinner loading={isLoading} size={18} color="#dc2626" />
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
