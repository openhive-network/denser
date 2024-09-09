import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Separator
} from '@ui/components';
import { handleError } from '@ui/lib/utils';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { useUserTitleMutation } from './hooks/use-user-title';

const ChangeTitleData = ({
  title,
  handlerOpen,
  titleMutation,
  community,
  userOnList,
  permlink
}: {
  title: string;
  handlerOpen: (e: boolean) => void;
  titleMutation: ReturnType<typeof useUserTitleMutation>;
  community: string;
  userOnList: string;
  permlink: string;
}) => {
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(title);
  const onSave = async () => {
    handlerOpen(false);
    try {
      await titleMutation.mutateAsync({
        community: community,
        username: userOnList,
        title: text,
        permlink: permlink
      });
    } catch (error) {
      handleError(error, {
        method: 'setUserTitle',
        params: { community: community, username: userOnList, title: text }
      });
    }
  };
  return (
    <>
      <div className="text-start">
        {t('communities.title')}
        <Input value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <Button variant="redHover" className="w-fit justify-self-end" onClick={onSave}>
        {t('communities.save')}
      </Button>
    </>
  );
};

export default ChangeTitleData;
