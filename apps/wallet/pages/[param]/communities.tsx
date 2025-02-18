import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label
} from '@ui/components';
import { useState } from 'react';
import { getTranslations } from '../../lib/get-translations';
import { createWaxFoundation } from '@hiveio/wax';
import { useCreateCommunityMutation } from '@/wallet/components/hooks/use-create-community-mutation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { handleError } from '@ui/lib/handle-error';
import { getAccount, getAccounts } from '@transaction/lib/hive';

const createCommunitySchema = z.object({
  title: z.string().min(1, 'Required'),
  about: z.string().min(1, 'Required'),
  saved_password: z.boolean().refine((value) => value === true, {
    message: 'Required'
  })
});

type CreateCommunityFormValues = z.infer<typeof createCommunitySchema>;

const getCommmunityName = () => {
  return `hive-${Math.floor(Math.random() * 100000) + 100000}`;
};

function Communities({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const [nextStep, setNextStep] = useState(false);
  const [generatedName, setGeneratedName] = useState<string>();
  const [generatedPassword, setGeneratedPassword] = useState<string>();
  const [publicKeys, setPublicKeys] = useState<{
    active: string;
    owner: string;
    posting: string;
    memoKey: string;
  }>();
  const createCommunityMutation = useCreateCommunityMutation(false);

  const form = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      about: ''
    }
  });

  const handleNext = async () => {
    let generatedName = getCommmunityName();

    await (async function generateName() {
      const existentAccount = await getAccount(generatedName);

      if (!!existentAccount) {
        generateName();
      }
    })();

    setGeneratedName(generatedName);

    const wax = await createWaxFoundation();
    // generate password
    const brainKeyData = wax.suggestBrainKey();
    const passwordToBeSavedByUser = 'P' + brainKeyData.wifPrivateKey;
    setGeneratedPassword(passwordToBeSavedByUser);

    // private keys for account authorities
    const owner = wax.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser);
    const active = wax.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser);
    const posting = wax.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser);
    const memoKey = wax.getPrivateKeyFromPassword(username, 'memo', passwordToBeSavedByUser);

    setPublicKeys({
      active: active.associatedPublicKey,
      owner: owner.associatedPublicKey,
      posting: posting.associatedPublicKey,
      memoKey: memoKey.associatedPublicKey
    });

    setNextStep(true);
  };

  async function onSubmit(_data: CreateCommunityFormValues) {
    if (publicKeys) {
      const params = {
        memoKey: publicKeys?.memoKey,
        owner: publicKeys?.owner,
        active: publicKeys?.active,
        posting: publicKeys?.posting,
        newAccountName: generatedName!,
        creator: username
      };
      try {
        await createCommunityMutation.mutateAsync(params);
      } catch (error) {
        handleError(error, { method: 'create_community', params });
      }
    }
  }

  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="flex flex-col gap-4 p-4">
          <h4>{t('communities.create_community')}</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('communities.title')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('communities.about')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!nextStep ? (
                <Button onClick={() => handleNext()} className="mt-2 w-fit">
                  {t('communities.next')}
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col border-2 bg-white p-2 text-red-700">
                    <span>{generatedName}</span> <span>{generatedPassword}</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="saved_password"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs">{t('communities.i_have_saved_password')}</FormLabel>{' '}
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button className="w-fit" type="submit">
                    {t('communities.create_community')}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </ProfileLayout>
  );
}

export default Communities;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
