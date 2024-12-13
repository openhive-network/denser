import React, { FC, Fragment, useState } from 'react';
import { Button, Input, Separator } from '@ui/components';
import AuthoritiesGroupItem from './authorities-group-item';
import AddAuthorityDialog from './add-authority-dialog';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { useTranslation } from 'next-i18next';
import { AuthorityLevel } from '@transaction/lib/hive';
import { FileX2, Pencil, Save, Trash } from 'lucide-react';
import { useUpdateAuthorityMutation } from './hooks/use-update-authority-mutation';

type GroupProps = {
  data: AuthorityLevel;
  width: number;
};

const AuthoritesGroup: FC<GroupProps> = ({ data, width }) => {
  const { t } = useTranslation('common_wallet');
  const [editThreshold, setEditThreshold] = useState(false);
  const [value, setValue] = useState(data.weight_threshold);
  const level = data.level;
  const updateThresholdAuthorityMutation = useUpdateAuthorityMutation();

  const onUpdate = () => {
    updateThresholdAuthorityMutation.mutate(
      {
        level: level,
        action: { type: 'setThreshold', payload: { threshold: value } }
      },
      {
        onSuccess: () => {
          setEditThreshold(false);
        }
      }
    );
  };
  return (
    <div className="container">
      <AccordionItem value={level} className="mt-6">
        <AccordionTrigger>
          <h2>{`${level.charAt(0).toUpperCase() + level.slice(1)} Authority`}</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid w-full grid-cols-[max-content_1fr_1fr_max-content] gap-1">
            <div className="col-span-4 grid grid-cols-subgrid items-center text-xs hover:bg-foreground/20 sm:text-base">
              <div className="flex items-center">
                <AddAuthorityDialog level={data.level} />
                <div className="w-0 text-nowrap">Add Key or Account</div>
              </div>
              <span className="justify-self-end font-medium">{t('authorities_page.threshold')}:</span>
              {editThreshold ? (
                <Input
                  value={value}
                  onChange={(e) => {
                    setValue(Number(e.target.value));
                  }}
                  className="h-6 w-1/2 self-center justify-self-center bg-white/10 p-0 px-3"
                />
              ) : (
                <span className="justify-self-center">{data.weight_threshold}</span>
              )}
              {editThreshold ? (
                <div className="flex items-center">
                  <Button variant="ghost" type="button" size="sm" title="Delete" onClick={onUpdate}>
                    <Save className="h-5 w-5" />
                  </Button>
                  <div className="h-5 w-5 px-[22px]" />
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditThreshold(false);
                      setValue(data.weight_threshold);
                    }}
                  >
                    <FileX2 className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="h-5 w-5 px-[22px]" />
                  <div className="h-5 w-5 px-[22px]" />
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditThreshold(true);
                    }}
                    title="Edit"
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>

            {data.key_auths.map((e, index) => (
              <Fragment key={index}>
                <AuthoritiesGroupItem width={width} item={e} level={data.level} />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}

            {data.account_auths.map((e, index) => (
              <Fragment key={index}>
                <AuthoritiesGroupItem width={width} item={e} level={data.level} />
                <Separator className="col-span-4 bg-foreground" />
              </Fragment>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default AuthoritesGroup;
