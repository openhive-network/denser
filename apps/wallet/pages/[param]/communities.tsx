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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@ui/components';
import { useEffect, useState } from 'react';
import { getTranslations } from '../../lib/get-translations';
import { ESupportedLanguages } from '@hiveio/wax';
import { useCreateCommunityMutation } from '@/wallet/components/hooks/use-create-community-mutation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { handleError } from '@ui/lib/handle-error';
import { getAccount } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@smart-signer/lib/auth/use-user';
import Loading from '@ui/components/loading';
import Link from 'next/link';
import env from '@beam-australia/react-env';

const getCommmunityName = () => {
  return `hive-${Math.floor(Math.random() * 100000) + 100000}`;
};

function Communities({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = useUser();
  const { data, isLoading } = useQuery(
    ['getAccounts', username],
    async () => await getAccount(user?.username),
    { enabled: user.isLoggedIn }
  );
  const { t } = useTranslation('common_wallet');
  const [advanced, setAdvanced] = useState(false);
  const createCommunityMutation = useCreateCommunityMutation();
  const [communityTag, setCommunityTag] = useState<string>('');

  const generateCommunity = async () => {
    let generatedName = getCommmunityName();
    await (async function generateName() {
      const existentAccount = await getAccount(generatedName);
      if (!!existentAccount) {
        generateName();
      }
    })();
    setCommunityTag(generatedName);
  };

  useEffect(() => {
    generateCommunity();
  }, []);
  const createCommunitySchema = z.object({
    title: z
      .string()
      .min(3, {
        message: t('communities.errors.minimum_characters', {
          value: 3
        })
      })
      .max(20, {
        message: t('communities.errors.maximum_characters', {
          value: 20
        })
      }),
    about: z.string().max(120, {
      message: t('communities.errors.maximum_characters', {
        value: 120
      })
    }),
    lang: z.nativeEnum(ESupportedLanguages),
    nsfw: z.boolean(),
    flagText: z.string(),
    description: z.string(),
    confirmFee: z.boolean().refine((value) => value === true, {
      message: t('communities.errors.required')
    }),
    saved_password: z.boolean().refine((value) => value === true, {
      message: t('communities.errors.required')
    })
  });
  type CreateCommunityFormValues = z.infer<typeof createCommunitySchema>;

  const form = useForm<CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      about: '',
      lang: ESupportedLanguages.ENGLISH,
      nsfw: false,
      flagText: '',
      description: '',
      confirmFee: false,
      saved_password: false
    }
  });

  const onSubmit = async (values: CreateCommunityFormValues) => {
    if (data) {
      const { title, about, lang, nsfw, flagText, description } = values;
      try {
        await createCommunityMutation.mutateAsync({
          memoKey: data?.memo_key,
          owner: data?.owner.key_auths,
          active: data?.active.key_auths,
          posting: data?.posting.key_auths,
          communityTag: communityTag,
          title: title,
          about: about,
          flagText: flagText,
          description: description,
          creator: user.username,
          lang: lang,
          nsfw: nsfw
        });
      } catch (error) {
        handleError(error, {
          method: 'create_community',
          params: {
            title: title,
            about: about,
            creator: username,
            lang: lang,
            nsfw: nsfw,
            flagText: flagText,
            description: description
          }
        });
      }
    }
  };

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <WalletMenu username={username} />
        <div className=" mx-auto my-4 flex max-w-2xl flex-col gap-4 p-4">
          {isLoading ? (
            <Loading loading={isLoading} />
          ) : createCommunityMutation.isLoading ? (
            <Loading loading={createCommunityMutation.isLoading} />
          ) : createCommunityMutation.isSuccess ? (
            <div className="flex flex-col gap-6">
              <h4 className="text-2xl font-bold">{t('communities.community_created')}</h4>
              <div>
                {t('communities.go_to_community')}
                <Link
                  className="text-destructive underline"
                  target="_blank"
                  href={`${env('BLOG_DOMAIN')}/trending/${communityTag}`}
                >
                  {communityTag}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h4 className="text-2xl font-bold">{t('communities.create_community')}</h4>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <h3 className="text-sm">{t('communities.assigned_owner_account')}</h3>
                    <Input value={communityTag} />
                    <p className="text-xs">{t('communities.communities_are_built')}</p>
                  </div>
                  {advanced ? (
                    <>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.description')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flagText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.flag_text')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lang"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('communities.lang')}</FormLabel>
                            <FormControl>
                              <Select {...field} onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ESupportedLanguages).map(([key, value]) => (
                                    <SelectItem key={key} value={value}>
                                      {t(`communities.languages.${value}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nsfw"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>{t('communities.nsfw')}</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}
                  <FormField
                    control={form.control}
                    name="confirmFee"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>{t('communities.payment_confirm')}</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saved_password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>
                            {t('communities.manage_confirm', {
                              communityName: communityTag,
                              username: user.username
                            })}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex w-full items-center justify-between">
                    <Button type="submit">{t('communities.create_community')}</Button>
                    <Button type="button" variant="outline" onClick={() => setAdvanced((prev) => !prev)}>
                      {advanced ? 'Basic' : 'Advanced'}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
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
